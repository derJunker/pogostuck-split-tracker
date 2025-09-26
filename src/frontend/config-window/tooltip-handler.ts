export function initTooltips() {
    // Find all tooltip triggers and set up their tooltips
    const tooltipTriggers = document.querySelectorAll('.tooltip-trigger');
    
    tooltipTriggers.forEach((trigger) => {
        const icon = trigger.querySelector('.tooltip-icon') as HTMLElement;
        const content = trigger.querySelector('.tooltip-content') as HTMLElement;
        
        if (!icon || !content) {
            console.warn('Tooltip trigger found without icon or content:', trigger);
            return;
        }
        
        // Set up hover listeners
        setupTooltipListeners(trigger as HTMLElement, icon, content);
        
        // Position the tooltip content relative to the icon (default to right)
        positionTooltipContent(content);
    });
}

function positionTooltipContent(content: HTMLElement) {
    // Remove any existing positioning classes
    content.classList.remove('tooltip-top', 'tooltip-bottom', 'tooltip-left', 'tooltip-right');
    
    // Default to right positioning
    content.classList.add('tooltip-right');
}

function setupTooltipListeners(trigger: HTMLElement, icon: HTMLElement, content: HTMLElement) {
    let hoverTimeout: NodeJS.Timeout;
    
    // Show tooltip on hover (with slight delay)
    const showTooltip = () => {
        clearTimeout(hoverTimeout);
        hoverTimeout = setTimeout(() => {
            content.style.opacity = '1';
            content.style.visibility = 'visible';
        }, 200); // 200ms delay
    };
    
    // Hide tooltip
    const hideTooltip = () => {
        clearTimeout(hoverTimeout);
        content.style.opacity = '0';
        content.style.visibility = 'hidden';
    };
    
    // Add event listeners to both trigger and icon
    [trigger, icon].forEach(element => {
        element.addEventListener('mouseenter', showTooltip);
        element.addEventListener('mouseleave', hideTooltip);
    });
    
    // Also hide tooltip when mouse leaves the content area
    content.addEventListener('mouseleave', hideTooltip);
    
    // Prevent tooltip from hiding when hovering over the content itself
    content.addEventListener('mouseenter', () => {
        clearTimeout(hoverTimeout);
    });
}

