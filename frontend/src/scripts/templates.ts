export class ChatTemplates {
	static thinkingIndicator(thinkingId: string): string {
		return `
			<div class="thinking-label">
				<i class="fas fa-brain"></i>
				<span>AI is thinking:</span>
			</div>
			<div class="tool-badges" id="${thinkingId}-badges"></div>
		`;
	}
	static toolBadge(toolName: string, state: 'processing' | 'completed'): string {
		const icon = state === 'processing' 
			? '<i class="fas fa-cog fa-spin"></i>'
			: '<i class="fas fa-check-circle"></i>';
		
		return `${icon}<span>${toolName}</span><p> tool is used<p>`;
	}

	static typingIndicator(): string {
		return `
			<div class="typing-dots">
				<span></span><span></span><span></span>
			</div>
		`;
	}

	static skeletonLoading(): string {
		return `
			<div class="skeleton-line skeleton-line-1"></div>
			<div class="skeleton-line skeleton-line-2"></div>
			<div class="skeleton-line skeleton-line-3"></div>
		`;
	}

	static userAvatar(): string {
		return '<i class="fas fa-user"></i>';
	}

	static assistantAvatar(): string {
		return '<i class="fas fa-robot"></i>';
	}
}
