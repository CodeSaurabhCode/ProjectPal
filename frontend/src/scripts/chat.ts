import { marked } from 'marked';
import { ChatTemplates } from './templates';

class ChatApp {
	private messagesContainer: HTMLElement;
	private messageInput: HTMLTextAreaElement;
	private sendButton: HTMLButtonElement;
	private chatForm: HTMLFormElement;
	private sidebar: HTMLElement;
	private sidebarToggle: HTMLElement;
	private mainContent: HTMLElement;
	private chatContainer: HTMLElement;
	private promptSuggestions: HTMLElement | null;
	private isStreaming: boolean = false;
	private currentThreadId: string | null = null;
	private readonly apiUrl: string = import.meta.env.PUBLIC_BACKEND_URL || 'http://localhost:3001';

	constructor() {
		this.messagesContainer = document.getElementById('chatMessages') as HTMLElement;
		this.messageInput = document.getElementById('messageInput') as HTMLTextAreaElement;
		this.sendButton = document.getElementById('sendButton') as HTMLButtonElement;
		this.chatForm = document.getElementById('chatForm') as HTMLFormElement;
		this.sidebar = document.getElementById('sidebar') as HTMLElement;
		this.sidebarToggle = document.getElementById('sidebarToggle') as HTMLElement;
		this.mainContent = document.querySelector('.main-content') as HTMLElement;
		this.chatContainer = document.getElementById('chatContainer') as HTMLElement;
		this.promptSuggestions = document.getElementById('promptSuggestions');

		this.init();
	}

	private init(): void {
		this.chatForm.addEventListener('submit', (e) => this.handleSubmit(e));
		this.messageInput.addEventListener('keydown', (e) => this.handleKeydown(e));
		this.messageInput.addEventListener('input', () => this.autoResize());

		this.sidebarToggle.addEventListener('click', () => this.toggleSidebar());

		document.querySelectorAll('.suggestion-card').forEach((card) => {
			card.addEventListener('click', () => {
				const prompt = card.getAttribute('data-prompt');
				if (prompt) {
					this.messageInput.value = prompt;
					this.messageInput.focus();
				}
			});
		});

		this.updateContainerState();
	}

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

	private hideSuggestions(): void {
		if (this.promptSuggestions) {
			this.promptSuggestions.classList.add('hidden');
		}
	}

	private toggleSidebar(): void {
		if (window.innerWidth > 768) {
			this.sidebar.classList.toggle('collapsed');
			this.mainContent.classList.toggle('sidebar-collapsed');
		} else {
			this.sidebar.classList.toggle('active');
		}
	}

	private handleKeydown(e: KeyboardEvent): void {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			this.chatForm.dispatchEvent(new Event('submit'));
		}
	}

	private autoResize(): void {
		this.messageInput.style.height = 'auto';
		this.messageInput.style.height =
			Math.min(this.messageInput.scrollHeight, 100) + 'px';
	}

	private async handleSubmit(e: Event): Promise<void> {
		e.preventDefault();
		const message = this.messageInput.value.trim();
		if (!message || this.isStreaming) return;

		this.hideSuggestions();

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

	private async sendMessage(message: string, typingId: string): Promise<void> {
		try {
			const requestBody: { message: string; threadId?: string } = { message };
			if (this.currentThreadId) {
				requestBody.threadId = this.currentThreadId;
			}

			const response = await fetch(`${this.apiUrl}/api/chat`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(requestBody),
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
			let thinkingProcessId: string | null = null;
			let currentEvent = '';

			this.removeTypingIndicator(typingId);

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				const chunk = decoder.decode(value, { stream: true });
				const lines = chunk.split('\n');

				for (const line of lines) {
					if (line.startsWith('event: ')) {
						currentEvent = line.slice(7).trim();
					} else if (line.startsWith('data: ')) {
						const eventData = line.slice(6).trim();
						if (eventData === '[DONE]') {
							return;
						}
						try {
							const parsed = JSON.parse(eventData);

							if (currentEvent === 'connected') {
								console.log('✅ Connected to chat stream');
							}
							else if (currentEvent === 'status') {
								if (parsed.status === 'thinking') {
									if (!thinkingProcessId) {
										thinkingProcessId = this.addSimpleThinkingIndicator();
									}
								}
								
								if (statusIndicatorId) {
									this.updateStatusIndicator(statusIndicatorId, parsed.message, parsed.status);
								} else {
									statusIndicatorId = this.addStatusIndicator(parsed.message, parsed.status);
								}
							}
							else if (currentEvent === 'chunk') {
								if (statusIndicatorId) {
									this.removeStatusIndicator(statusIndicatorId);
									statusIndicatorId = null;
								}

								if (!assistantMessageId) {
									assistantMessageId = this.addMessage('', 'assistant');
								}

								const chunkText = parsed.chunk || '';
								fullResponse += chunkText;
								this.updateMessage(assistantMessageId, fullResponse);
							}
							else if (currentEvent === 'tool') {
								const toolName = parsed.displayName || parsed.tool;
								console.log(`🔧 Tool used: ${toolName}`);
								console.log('🔧 Adding tool badge for:', toolName);
								
								if (thinkingProcessId) {
									this.addToolUsageBadge(thinkingProcessId, toolName);
									console.log('🔧 Tool badge added!');
								} else {
									console.warn('⚠️ No thinking indicator exists yet, creating one...');
									thinkingProcessId = this.addSimpleThinkingIndicator();
									this.addToolUsageBadge(thinkingProcessId, toolName);
								}
								
								if (statusIndicatorId) {
									this.updateStatusIndicator(statusIndicatorId, `Using ${toolName}...`, 'tool_use');
								}
							}
							else if (currentEvent === 'complete') {
								if (parsed.threadId) {
									this.currentThreadId = parsed.threadId;
									console.log('💾 Thread ID saved:', this.currentThreadId);
								}

								if (statusIndicatorId) {
									this.removeStatusIndicator(statusIndicatorId);
									statusIndicatorId = null;
								}

							if (thinkingProcessId && thinkingProcessId.startsWith('simple-thinking-')) {
								setTimeout(() => {
									const thinkingDiv = document.getElementById(thinkingProcessId!);
									if (thinkingDiv) {
										thinkingDiv.classList.add('fade-out');
										setTimeout(() => thinkingDiv.remove(), 500);
									}
								}, 2000);
							}								if (parsed.text) {
									if (!assistantMessageId) {
										assistantMessageId = this.addMessage(parsed.text, 'assistant');
									} else {
										this.updateMessage(assistantMessageId, parsed.text);
									}
								}

								if (parsed.usage) {
									console.log('📊 Token usage:', parsed.usage);
								}
							}
							else if (currentEvent === 'error') {
								console.error('❌ Error:', parsed.message);
								if (statusIndicatorId) {
									this.removeStatusIndicator(statusIndicatorId);
									statusIndicatorId = null;
								}
								this.addMessage(`Error: ${parsed.message}`, 'assistant');
							}
							else if (currentEvent === 'end') {
								console.log('✅ Stream ended');
							}
						} catch (e) {
							console.warn('Failed to parse SSE data:', eventData, e);
						}
					}
				}
			}
			
			if (statusIndicatorId) {
				this.removeStatusIndicator(statusIndicatorId);
			}
		} catch (error) {
			this.removeTypingIndicator(typingId);
			throw error;
		}
	}

	private addMessage(content: string, type: 'user' | 'assistant'): string {
		const messageId = 'msg-' + Date.now() + Math.random();
		const messageDiv = document.createElement('div');
		messageDiv.className = `message ${type}`;
		messageDiv.id = messageId;

		const avatar = document.createElement('div');
		avatar.className = 'message-avatar';
		avatar.innerHTML = type === 'user' 
			? ChatTemplates.userAvatar() 
			: ChatTemplates.assistantAvatar();

		const contentDiv = document.createElement('div');
		contentDiv.className = 'message-content';
		if (content) {
			contentDiv.innerHTML = marked.parse(content) as string;
		} else {
			if (type === 'assistant') {
				contentDiv.classList.add('skeleton-loading');
				contentDiv.innerHTML = ChatTemplates.skeletonLoading();
			} else {
				contentDiv.classList.add('empty');
			}
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

	private updateMessage(messageId: string, content: string): void {
		const messageDiv = document.getElementById(messageId);
		if (messageDiv) {
			const contentDiv = messageDiv.querySelector('.message-content');
			if (contentDiv) {
				if (contentDiv.classList.contains('skeleton-loading')) {
					contentDiv.classList.remove('skeleton-loading');
					contentDiv.innerHTML = '';
				}
				if (contentDiv.classList.contains('empty')) {
					contentDiv.classList.remove('empty');
				}
				contentDiv.innerHTML = marked.parse(content) as string;
				this.addCopyButtons(contentDiv as HTMLElement);
				this.scrollToBottom();
			}
		}
	}

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

	private addTypingIndicator(): string {
		const typingId = 'typing-indicator';
		if (document.getElementById(typingId)) return typingId;

		const typingDiv = document.createElement('div');
		typingDiv.className = 'typing-indicator';
		typingDiv.id = typingId;
		typingDiv.innerHTML = ChatTemplates.typingIndicator();
		
		this.messagesContainer.appendChild(typingDiv);
		this.scrollToBottom();
		return typingId;
	}

	private removeTypingIndicator(typingId: string): void {
		const typingDiv = document.getElementById(typingId);
		if (typingDiv) {
			typingDiv.remove();
		}
	}

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

	private updateStatusIndicator(statusId: string, message: string, status: string, tool?: string): void {
		const statusDiv = document.getElementById(statusId);
		if (statusDiv) {
			const statusHeader = statusDiv.querySelector('.status-header');
			if (statusHeader) {
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

	private removeStatusIndicator(statusId: string): void {
		const statusDiv = document.getElementById(statusId);
		if (statusDiv) {
			statusDiv.remove();
		}
	}

	private addSimpleThinkingIndicator(): string {
		console.log('📝 addSimpleThinkingIndicator() called');
		const thinkingId = 'simple-thinking-' + Date.now();
		const thinkingDiv = document.createElement('div');
		thinkingDiv.className = 'simple-thinking-indicator';
		thinkingDiv.id = thinkingId;
		
		thinkingDiv.innerHTML = ChatTemplates.thinkingIndicator(thinkingId);
		
		this.messagesContainer.appendChild(thinkingDiv);
		console.log('📝 Thinking indicator appended to DOM with ID:', thinkingId);
		this.scrollToBottom();
		return thinkingId;
	}

	private addToolUsageBadge(thinkingId: string, toolName: string): void {
		console.log('🏷️ addToolUsageBadge() called for:', toolName, 'in container:', thinkingId);
		const badgesContainer = document.getElementById(`${thinkingId}-badges`);
		if (!badgesContainer) {
			console.error('❌ Badges container not found:', `${thinkingId}-badges`);
			return;
		}
		
		console.log('🏷️ Badges container found, creating badge...');
		const badge = document.createElement('span');
		badge.className = 'tool-badge';
		badge.innerHTML = ChatTemplates.toolBadge(toolName, 'processing');
		
		badgesContainer.appendChild(badge);
		console.log('🏷️ Badge appended to container');
		this.scrollToBottom();

		setTimeout(() => {
			console.log('✅ Marking badge as completed:', toolName);
			badge.classList.add('completed');
			badge.innerHTML = ChatTemplates.toolBadge(toolName, 'completed');
		}, 1000);
	}

	private setInputDisabled(disabled: boolean): void {
		this.messageInput.disabled = disabled;
		this.sendButton.disabled = disabled;
	}

	private scrollToBottom(): void {
		this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
	}
}

document.addEventListener('DOMContentLoaded', () => {
	new ChatApp();
});
