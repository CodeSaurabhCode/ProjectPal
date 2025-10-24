import { marked } from 'marked';

class ChatApp {
	private messagesContainer: HTMLElement;
	private messageInput: HTMLTextAreaElement;
	private sendButton: HTMLButtonElement;
	private chatForm: HTMLFormElement;
	private sidebar: HTMLElement;
	private sidebarToggle: HTMLElement;
	private mainContent: HTMLElement;
	private chatContainer: HTMLElement;
	private isStreaming: boolean = false;
	private readonly apiUrl: string = 'http://localhost:3001';

	constructor() {
		this.messagesContainer = document.getElementById('chatMessages') as HTMLElement;
		this.messageInput = document.getElementById('messageInput') as HTMLTextAreaElement;
		this.sendButton = document.getElementById('sendButton') as HTMLButtonElement;
		this.chatForm = document.getElementById('chatForm') as HTMLFormElement;
		this.sidebar = document.getElementById('sidebar') as HTMLElement;
		this.sidebarToggle = document.getElementById('sidebarToggle') as HTMLElement;
		this.mainContent = document.querySelector('.main-content') as HTMLElement;
		this.chatContainer = document.getElementById('chatContainer') as HTMLElement;

		this.init();
	}

	/**
	 * Initialize event listeners and welcome message
	 */
	private init(): void {
		this.chatForm.addEventListener('submit', (e) => this.handleSubmit(e));
		this.messageInput.addEventListener('keydown', (e) => this.handleKeydown(e));
		this.messageInput.addEventListener('input', () => this.autoResize());

		this.sidebarToggle.addEventListener('click', () => this.toggleSidebar());

		// Setup suggestion cards
		document.querySelectorAll('.suggestion-card').forEach((card) => {
			card.addEventListener('click', () => {
				const prompt = card.getAttribute('data-prompt');
				if (prompt) {
					this.messageInput.value = prompt;
					this.messageInput.focus();
				}
			});
		});

		// Set initial state as empty
		this.updateContainerState();
	}

	/**
	 * Update container state based on message count
	 */
	private updateContainerState(): void {
		const messageCount = this.messagesContainer.querySelectorAll('.message').length;
		if (messageCount === 0) {
			this.chatContainer.classList.add('empty');
			this.chatContainer.classList.remove('has-messages');
		} else {
			this.chatContainer.classList.remove('empty');
			this.chatContainer.classList.add('has-messages');
		}
	}

	/**
	 * Toggle sidebar visibility
	 */
	private toggleSidebar(): void {
		if (window.innerWidth > 768) {
			// Desktop: collapse/expand sidebar
			this.sidebar.classList.toggle('collapsed');
			this.mainContent.classList.toggle('sidebar-collapsed');
		} else {
			// Mobile: slide in/out sidebar
			this.sidebar.classList.toggle('active');
		}
	}

	/**
	 * Handle keyboard events in textarea
	 */
	private handleKeydown(e: KeyboardEvent): void {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			this.chatForm.dispatchEvent(new Event('submit'));
		}
	}

	/**
	 * Auto-resize textarea based on content
	 */
	private autoResize(): void {
		this.messageInput.style.height = 'auto';
		this.messageInput.style.height =
			Math.min(this.messageInput.scrollHeight, 100) + 'px';
	}

	/**
	 * Handle form submission
	 */
	private async handleSubmit(e: Event): Promise<void> {
		e.preventDefault();
		const message = this.messageInput.value.trim();
		if (!message || this.isStreaming) return;

		this.addMessage(message, 'user');
		this.messageInput.value = '';
		this.autoResize();

		this.setInputDisabled(true);
		this.isStreaming = true;

		const typingId = this.addTypingIndicator();

		try {
			await this.sendMessage(message, typingId);
		} catch (error) {
			console.error('Chat error:', error);
			this.removeTypingIndicator(typingId);
			this.addMessage(
				`Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
				'assistant'
			);
		} finally {
			this.setInputDisabled(false);
			this.isStreaming = false;
			this.messageInput.focus();
		}
	}

	/**
	 * Send message to API and handle streaming response
	 */
	private async sendMessage(message: string, typingId: string): Promise<void> {
		try {
			const response = await fetch(`${this.apiUrl}/api/chat`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ message }),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({
					message: response.statusText,
				}));
				throw new Error(`HTTP ${response.status}: ${errorData.message}`);
			}

			const reader = response.body?.getReader();
			if (!reader) throw new Error('Response body is not readable');

			const decoder = new TextDecoder();
			let assistantMessageId: string | null = null;
			let fullResponse = '';
			let statusIndicatorId: string | null = null;

			this.removeTypingIndicator(typingId);

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				const chunk = decoder.decode(value, { stream: true });
				const lines = chunk.split('\n');

				for (const line of lines) {
					if (line.startsWith('data: ')) {
						const eventData = line.slice(6).trim();
						if (eventData === '[DONE]') {
							return;
						}
						try {
							const parsed = JSON.parse(eventData);
							
							// Handle status updates
							if (parsed.type === 'status') {
								if (statusIndicatorId) {
									this.updateStatusIndicator(statusIndicatorId, parsed.message, parsed.status, parsed.tool);
								} else {
									statusIndicatorId = this.addStatusIndicator(parsed.message, parsed.status, parsed.tool);
								}
							}
							// Handle content chunks
							else if (parsed.type === 'chunk' && parsed.content) {
								// Remove status indicator when content starts coming
								if (statusIndicatorId) {
									this.removeStatusIndicator(statusIndicatorId);
									statusIndicatorId = null;
								}
								
								// Create message if not exists
								if (!assistantMessageId) {
									assistantMessageId = this.addMessage('', 'assistant');
								}
								
								fullResponse += parsed.content;
								this.updateMessage(assistantMessageId, fullResponse);
							}
							// Handle completion
							else if (parsed.type === 'complete') {
								if (statusIndicatorId) {
									this.removeStatusIndicator(statusIndicatorId);
									statusIndicatorId = null;
								}
								
								if (!assistantMessageId) {
									assistantMessageId = this.addMessage(parsed.response, 'assistant');
								} else {
									this.updateMessage(assistantMessageId, parsed.response);
								}
							}
						} catch (e) {
							// Ignore malformed JSON
							console.warn('Failed to parse SSE data:', eventData);
						}
					}
				}
			}
			
			// Clean up any remaining status indicator
			if (statusIndicatorId) {
				this.removeStatusIndicator(statusIndicatorId);
			}
		} catch (error) {
			this.removeTypingIndicator(typingId);
			throw error;
		}
	}

	/**
	 * Add a new message to the chat
	 */
	private addMessage(content: string, type: 'user' | 'assistant'): string {
		const messageId = 'msg-' + Date.now() + Math.random();
		const messageDiv = document.createElement('div');
		messageDiv.className = `message ${type}`;
		messageDiv.id = messageId;

		const avatar = document.createElement('div');
		avatar.className = 'message-avatar';
		avatar.innerHTML =
			type === 'user'
				? '<i class="fas fa-user"></i>'
				: '<i class="fas fa-robot"></i>';

		const contentDiv = document.createElement('div');
		contentDiv.className = 'message-content';
		if (content) {
			contentDiv.innerHTML = marked.parse(content) as string;
		} else {
			contentDiv.classList.add('empty');
		}

		if (type === 'user') {
			messageDiv.appendChild(contentDiv);
			messageDiv.appendChild(avatar);
		} else {
			messageDiv.appendChild(avatar);
			messageDiv.appendChild(contentDiv);
		}

		this.messagesContainer.appendChild(messageDiv);
		this.updateContainerState();
		this.scrollToBottom();
		return messageId;
	}

	/**
	 * Update an existing message content
	 */
	private updateMessage(messageId: string, content: string): void {
		const messageDiv = document.getElementById(messageId);
		if (messageDiv) {
			const contentDiv = messageDiv.querySelector('.message-content');
			if (contentDiv) {
				if (contentDiv.classList.contains('empty')) {
					contentDiv.classList.remove('empty');
				}
				contentDiv.innerHTML = marked.parse(content) as string;
				this.addCopyButtons(contentDiv as HTMLElement);
				this.scrollToBottom();
			}
		}
	}

	/**
	 * Add copy buttons to code blocks
	 */
	private addCopyButtons(container: HTMLElement): void {
		const pres = container.querySelectorAll('pre');
		pres.forEach((pre) => {
			if (pre.querySelector('.copy-code-btn')) return;

			const copyBtn = document.createElement('button');
			copyBtn.className = 'copy-code-btn';
			copyBtn.textContent = 'Copy';
			copyBtn.addEventListener('click', () => {
				const code = pre.querySelector('code')?.innerText || '';
				navigator.clipboard.writeText(code).then(() => {
					copyBtn.textContent = 'Copied!';
					setTimeout(() => {
						copyBtn.textContent = 'Copy';
					}, 2000);
				});
			});
			pre.appendChild(copyBtn);
		});
	}

	/**
	 * Add typing indicator
	 */
	private addTypingIndicator(): string {
		const typingId = 'typing-indicator';
		if (document.getElementById(typingId)) return typingId;

		const typingDiv = document.createElement('div');
		typingDiv.className = 'typing-indicator';
		typingDiv.id = typingId;
		typingDiv.innerHTML = `
			<div class="typing-dots">
				<span></span><span></span><span></span>
			</div>
		`;
		this.messagesContainer.appendChild(typingDiv);
		this.scrollToBottom();
		return typingId;
	}

	/**
	 * Remove typing indicator
	 */
	private removeTypingIndicator(typingId: string): void {
		const typingDiv = document.getElementById(typingId);
		if (typingDiv) {
			typingDiv.remove();
		}
	}

	/**
	 * Add status indicator
	 */
	private addStatusIndicator(message: string, status: string, tool?: string): string {
		const statusId = 'status-' + Date.now();
		const statusDiv = document.createElement('div');
		statusDiv.className = 'status-indicator';
		statusDiv.id = statusId;

		const avatar = document.createElement('div');
		avatar.className = 'message-avatar';
		avatar.innerHTML = '<i class="fas fa-robot"></i>';

		const statusContent = document.createElement('div');
		statusContent.className = 'status-content';

		const statusHeader = document.createElement('div');
		statusHeader.className = 'status-header';
		
		const spinner = document.createElement('span');
		spinner.className = 'status-spinner';
		statusHeader.appendChild(spinner);

		const statusText = document.createElement('span');
		statusText.className = 'status-text';
		statusText.textContent = message;
		statusHeader.appendChild(statusText);

		if (tool) {
			const toolBadge = document.createElement('span');
			toolBadge.className = 'status-tool';
			toolBadge.textContent = tool;
			statusHeader.appendChild(toolBadge);
		}

		statusContent.appendChild(statusHeader);
		statusDiv.appendChild(avatar);
		statusDiv.appendChild(statusContent);

		this.messagesContainer.appendChild(statusDiv);
		this.scrollToBottom();
		return statusId;
	}

	/**
	 * Update status indicator
	 */
	private updateStatusIndicator(statusId: string, message: string, status: string, tool?: string): void {
		const statusDiv = document.getElementById(statusId);
		if (statusDiv) {
			const statusHeader = statusDiv.querySelector('.status-header');
			if (statusHeader) {
				// Clear and rebuild
				statusHeader.innerHTML = '';
				
				const spinner = document.createElement('span');
				spinner.className = 'status-spinner';
				statusHeader.appendChild(spinner);

				const statusText = document.createElement('span');
				statusText.className = 'status-text';
				statusText.textContent = message;
				statusHeader.appendChild(statusText);
				
				if (tool) {
					const toolBadge = document.createElement('span');
					toolBadge.className = 'status-tool';
					toolBadge.textContent = tool;
					statusHeader.appendChild(toolBadge);
				}
			}
		}
	}

	/**
	 * Remove status indicator
	 */
	private removeStatusIndicator(statusId: string): void {
		const statusDiv = document.getElementById(statusId);
		if (statusDiv) {
			statusDiv.remove();
		}
	}

	/**
	 * Enable/disable input controls
	 */
	private setInputDisabled(disabled: boolean): void {
		this.messageInput.disabled = disabled;
		this.sendButton.disabled = disabled;
	}

	/**
	 * Scroll chat to bottom
	 */
	private scrollToBottom(): void {
		this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
	}
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
	new ChatApp();
});
