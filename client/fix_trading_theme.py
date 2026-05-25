import re

file_path = "src/components/pages/TradingDashboard.jsx"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Define the replacements (from hardcoded dark to light/dark responsive)
replacements = [
    # Backgrounds
    (r'\bbg-gray-950/20\b', 'bg-slate-50/50 dark:bg-gray-950/20'),
    (r'\bbg-gray-950/40\b', 'bg-slate-50/50 dark:bg-gray-950/40'),
    (r'\bbg-gray-950\b', 'bg-white dark:bg-gray-950'),
    
    (r'\bbg-gray-900/20\b', 'bg-slate-50 dark:bg-gray-900/20'),
    (r'\bbg-gray-900/30\b', 'bg-slate-50 dark:bg-gray-900/30'),
    (r'\bbg-gray-900/40\b', 'bg-slate-100 dark:bg-gray-900/40'),
    (r'\bbg-gray-900/50\b', 'bg-slate-100 dark:bg-gray-900/50'),
    (r'\bbg-gray-900\b', 'bg-slate-50 dark:bg-gray-900'),
    
    (r'\bbg-gray-800/30\b', 'bg-slate-100 dark:bg-gray-800/30'),
    (r'\bbg-gray-800\b', 'bg-white dark:bg-gray-800'),
    (r'\bbg-gray-700/50\b', 'bg-slate-100 dark:bg-gray-700/50'),
    (r'\bbg-gray-700\b', 'bg-slate-100 dark:bg-gray-700'),
    
    # Text colors
    (r'\btext-gray-100\b', 'text-slate-900 dark:text-gray-100'),
    (r'\btext-white\b', 'text-slate-900 dark:text-white'),
    (r'\btext-gray-300\b', 'text-slate-700 dark:text-gray-300'),
    (r'\btext-gray-400\b', 'text-slate-500 dark:text-gray-400'),
    (r'\btext-gray-500\b', 'text-slate-400 dark:text-gray-500'),
    (r'\btext-gray-600\b', 'text-slate-400 dark:text-gray-600'),
    (r'\btext-gray-700\b', 'text-slate-400 dark:text-gray-700'),
    
    # Border colors
    (r'\bborder-gray-800/50\b', 'border-slate-200 dark:border-gray-800/50'),
    (r'\bborder-gray-800/30\b', 'border-slate-200 dark:border-gray-800/30'),
    (r'\bborder-gray-800\b', 'border-slate-200 dark:border-gray-800'),
    (r'\bborder-gray-700/50\b', 'border-slate-200 dark:border-gray-700/50'),
    (r'\bborder-gray-700\b', 'border-slate-200 dark:border-gray-700'),
    
    # Divide
    (r'\bdivide-gray-800/30\b', 'divide-slate-200 dark:divide-gray-800/30'),
]

new_content = content
for old, new in replacements:
    new_content = re.sub(old, new, new_content)

# Specific fixes for text-white in buttons / badges that should remain white in light mode
new_content = new_content.replace('bg-blue-600 text-slate-900 dark:text-white', 'bg-blue-600 text-white')
new_content = new_content.replace('text-slate-900 dark:text-white px-3', 'text-white px-3')

# MarketIndexCard dark mode prop fix
new_content = new_content.replace('dark={true}', 'dark={false}') # It should be responsive

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)
    
print("Replaced Tailwind classes for responsiveness!")
