import vscode, { Thenable } from 'vscode';

import { setLatestSearch, getLatestSearch } from './storage';

type SearchType = 'string'|'regex';

interface PromptFilterLinesArgs {
  searchType?: SearchType;
  invertSearch?: boolean;
}

export function activate(this: void, extensionContext: vscode.ExtensionContext) {
  extensionContext.subscriptions.push(
    vscode.commands.registerTextEditorCommand('onCommand:vscode-better-filter.includeLinesWithRegex', (editor) => {
			const args: PromptFilterLinesArgs = { searchType: 'regex', invertSearch: false };
			promptFilterLines(editor, args).then();
		}),
		vscode.commands.registerTextEditorCommand('onCommand:vscode-better-filter.includeLinesWithString', (editor) => {
			const args: PromptFilterLinesArgs = { searchType: 'string', invertSearch: false };
			promptFilterLines(editor, args).then();
		}),
		vscode.commands.registerTextEditorCommand('onCommand:vscode-better-filter.excludeLinesWithRegex', (editor) => {
			const args: PromptFilterLinesArgs = { searchType: 'regex', invertSearch: true };
			promptFilterLines(editor, args).then();
		}),
		vscode.commands.registerTextEditorCommand('onCommand:vscode-better-filter.excludeLinesWithString', (editor) => {
			const args: PromptFilterLinesArgs = { searchType: 'string', invertSearch: true };
			promptFilterLines(editor, args).then();
    }),
  );
}

async function promptFilterLines(editor: vscode.TextEditor, args: PromptFilterLinesArgs): Promise<void> {
	const { searchType, invertSearch } = args;

  const searchText = await promptForSearchText(editor, searchType, invertSearch);
  if (searchText == undefined) {
		return;
	}

	setLatestSearch(searchText);

  filterLines(editor, searchType, invertSearch, searchText);
}

function promptForSearchText(editor: vscode.TextEditor, searchType: SearchType, invertSearch: boolean): Thenable<string|undefined> {
  const prompt = `Filter to lines ${invertSearch ? 'not ' : ''}${searchType === 'string' ? 'containing' : 'matching'}: `;

  let searchText = getLatestSearch();
  if (!searchText) {
    const wordRange = editor.document.getWordRangeAtPosition(editor.selection.active);
    if (wordRange) {
      searchText = editor.document.getText(wordRange);
		}
  }

  return vscode.window.showInputBox({
    prompt,
    value: searchText,
  });
}

async function filterLines(
  editor: vscode.TextEditor,
  searchType: SearchType,
	invertSearch: boolean,
  searchText: string,
) {
  const re = constructSearchRegExp(searchText, searchType);

  const matchingLines: number[] = [];
  for (let lineno = 0; lineno < editor.document.lineCount; ++lineno) {
    const lineText = editor.document.lineAt(lineno).text;
    if (re.test(lineText) !== invertSearch) {
      matchingLines.push(lineno);
    }
  }

	const content: string[] = [];
	for (const lineno of matchingLines) {
		content.push(editor.document.lineAt(lineno).text);
		content.push('\n');
	}
	const doc = await vscode.workspace.openTextDocument({ language: editor.document.languageId, content: content.join('') });
	await vscode.window.showTextDocument(doc);
}

function constructSearchRegExp(searchText: string, searchType: SearchType): RegExp {
  let flags = '';
  if (searchType === 'string') {
    searchText = escapeRegexp(searchText);
    flags = 'i';
  }
  return new RegExp(searchText, flags);
}

function escapeRegexp(s: string): string {
	return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}
