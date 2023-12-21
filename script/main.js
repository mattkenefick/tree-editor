/*

Still needs work, but it's a start.

your-project/
├── manifest.json
├── src/
│   ├── your-file.ts
│   └── your-index.html
└── tools/
    └── shell/
        └── my-file.sh
*/

const editor = document.querySelector('#editor');
const code = document.querySelector('#debug');

const indentationCharacters = ['├', '│', '└', '─'];

// User Input
// ---------------------------------------------------------------

editor.addEventListener('keydown', (e) => {
	const code = e.code;

	switch (code) {
		case 'Enter':
			e.preventDefault();
			handleEnter();
			return;

		case 'Tab':
			e.preventDefault();
			handleTab(e.shiftKey);
			return;
	}
});

editor.addEventListener('keyup', (e) => {
	handleDebug();
});

editor.addEventListener('paste', async (e) => {
	await sleep(1);
	handlePaste();
});

// Actions
// ---------------------------------------------------------------

function handleDebug() {
	code.innerText = getNormalizedText().replace(/\t/g, '∙');
}

function handleEnter() {
	const currentPos = getCursorStart();
	const currentLineIndentation = getCurrentIndentation();
	const nextLineIndentation = getIndentationOfNextLine();
	const indentationCharacter = getIndentationCharacter();

	// Generate tree
	editor.value = render().trim();

	// Indent to current
	editor.value = insertAt(getText(), '\n' + currentLineIndentation + (currentLineIndentation ? indentationCharacter : ''), currentPos - 1);

	// Move selection
	editor.setSelectionRange(currentPos + currentLineIndentation.length + 1 + indentationCharacter.length, currentPos + currentLineIndentation.length + 1 + indentationCharacter.length);
}

function handlePaste() {
	editor.value = getText()
		.replace(/(?:^|\n)( +)/g, (match, spaces) => '\n' + '\t'.repeat(spaces.length))
		.trim();

	editor.value = render().trim();
}

function handleTab(reverse = false) {
	const currentLineNumber = findLineNumber();
	const newPosition = findNearestLinePosition(getCursorStart(), -1);

	// Add tabs
	if (newPosition === null) {
		editor.value += '\t';
	} else {
		editor.value = reverse ? removeForward(editor.value, '\t', newPosition) : insertAt(editor.value, '\t', newPosition);
	}

	// Render
	editor.value = render().replace(/[\t\n]+$/, '');
	setCursorOnLine(currentLineNumber);
}

// Helpers
// ---------------------------------------------------------------

function findLineNumber() {
	const cursorPosition = getCursorStart();
	const text = getText();
	const index = text.substring(0, cursorPosition).split('\n').length - 1;
	return index;
}

function findNearestLinePosition(position, direction = 1) {
	const text = getText();

	// Go back one because it's the end of the text
	let index = position === text.length ? position - 1 : position;

	// If you're highlighting the end of the line, go back
	if (text[index]?.match(/\n/)) {
		index += direction;
	}

	// Find the next line break
	while (text[index] !== undefined) {
		if (text[index] === '\n') {
			return index;
		}

		index += direction;
	}

	return null;
}

function getCurrentIndentation() {
	const cursorPosition = getCursorStart();
	const text = getText();
	const index = text.substring(0, cursorPosition).lastIndexOf('\n');
	const line = text.substring(index + 1, cursorPosition);
	const indentation = line.match(/^\t*/)[0];

	return indentation;
}

function getIndentationOfNextLine() {
	const cursorPosition = findNearestLinePosition(getCursorStart() + 1);
	const text = getText();
	const index = text.substring(0, cursorPosition).lastIndexOf('\n');
	const line = text.substring(index + 1, cursorPosition);
	const indentation = line.match(/^\t*/)[0];

	return indentation;
}

function getIndentationCharacter() {
	return getCurrentIndentation() === getIndentationOfNextLine() ? '├── ' : '└── ';
}

function getCursorStart() {
	return editor.selectionStart;
}

function getText() {
	return editor.value;
}

function getNormalizedText() {
	const regexp = new RegExp(`[${indentationCharacters.join('|')}]`, 'gi');
	// const output = getText().replace(regexp, '').replace(/^ /g, '').trim();
	const output = getText().replace(regexp, '').replace(/^ /g, '').replace(/\n+$/g, '\n');

	return output;
}

function insertAt(source, dest, position) {
	return [source.slice(0, position + 1), dest, source.slice(position + 1)].join('');
}

function nthIndex(string, subString, index) {
	return string.split(subString, index).join(subString).length;
}

function removeForward(source, character, position) {
	let section = source.substring(position, position + 2);
	section = section.replace(character, '');

	const output = source.substr(0, position) + section + source.substr(position + 2);

	return output;
}

function parseTree(text) {
	const lines = text.split('\n');
	const root = { name: 'root', children: [] };
	const stack = [root];

	lines.forEach((line) => {
		const depth = line.lastIndexOf('\t') + 1;
		const node = { name: line.trim(), children: [] };

		while (stack.length > depth + 1) {
			stack.pop();
		}

		const parent = stack[stack.length - 1];
		parent.children.push(node);
		stack.push(node);
	});

	return root.children;
}

function printTree(nodes, prefix = '', depth = 0) {
	let result = '';

	for (let i = 0; i < nodes.length; i++) {
		const lastNode = i === nodes.length - 1;
		const node = nodes[i];

		if (depth > 0) {
			result += prefix + (lastNode ? '└── ' : '├── ') + node.name + '\n';
		} else {
			result += prefix + node.name + '\n';
		}

		if (node.children.length) {
			const newPrefix = prefix + (lastNode ? '\t' : '│\t');
			result += printTree(node.children, newPrefix, depth + 1);
		}
	}

	return result;
}

function render() {
	const text = getNormalizedText();
	const tree = parseTree(text);
	const output = printTree(tree);

	editor.value = output;

	return output;
}

function setCursorOnLine(lineNumber) {
	const currentPos = nthIndex(getText(), '\n', lineNumber + 1);
	editor.setSelectionRange(currentPos, currentPos);
}

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
