import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import Kuroshiro from "kuroshiro";
// Initialize kuroshiro with an instance of analyzer (You could check the [apidoc](#initanalyzer) for more information):
// For this example, you should npm install and import the kuromoji analyzer first
import KuromojiAnalyzer from "kuroshiro-analyzer-kuromoji";
// Instantiate
import * as kuromoji from "kuromoji";
import * as path from 'path';
// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;
	//tokenizer: kuromoji.Tokenizer<kuromoji.IpadicFeatures>;
	kuroshiro = new Kuroshiro();
	analyser:  KuromojiAnalyzer = null

	async onload() {
		await this.loadSettings();

		// Load the tokenizer
		const dictBase = this.manifest.dir + "/dict/"
		const dictPath2 = this.app.vault.adapter.getResourcePath(dictBase)
		const arr = dictPath2.split('?', 2)
		this.analyser = new KuromojiAnalyzer({ dictPath: arr[0] })
		await this.kuroshiro.init(this.analyser)


		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice!');
		});

		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Open sample modal (simple)',
			callback: () => {
				new SampleModal(this.app).open();
			}
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'sample-editor-command',
			name: 'Sample editor command',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection('Sample Editor Command');
			}
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});

		// This command takes the currently selected text and converts it to the same text, but with <ruby>
		// tags added.
		this.addCommand({
			id: 'add-ruby',
			name: 'Add <ruby> tag for selected text',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				//const selected = editor.getSelection();


				const cursor = editor.getCursor()
				const selectedText = editor.getSelection()
				//const lineText = editor.getLine(cursor.line)
				console.log("Input: " + selectedText)
				const result = await this.kuroshiro.convert(selectedText, { to: "hiragana", mode: "furigana" });
				console.log("Output: " + result)
				editor.replaceSelection(result)
				return true;
			}
		});

		// This command takes the currently selected text and converts it to the same text, but with <ruby>
		// tags added.
		this.addCommand({
			id: 'jlt-morphology',
			name: 'breakdown the morphology for selected text',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				//const selected = editor.getSelection();


				const cursor = editor.getCursor()
				const selectedText = editor.getSelection()
				//const lineText = editor.getLine(cursor.line)
				console.log("Input: " + selectedText)

				const result = await this.analyser.parse(selectedText);
				console.log(result)
				const lineCount = editor.lineCount()
				let output = "\n\n Surface Form | Type | Hirigana | Jisho\n----|----|----|----"
				for (let index = 0; index < result.length; index++) {
					const element = result[index];
					let type = element.pos
					
					if (type == "名詞") type = "Noun"
					else if (type == "助詞") type = "Particle"
					else if (type == "記号") type = "Symbol"
					else if (type == "フィラー") type = "Filler"
					else if (type == "助動詞") type = "Bound Auxillary"
					else if (type == "動詞") type = "Verb"

					output = output + "\n" + 
						element.surface_form + " | " + 
						type + " | " + 
						Kuroshiro.Util.kanaToHiragna(element.pronunciation) + 
						" | ["+element.surface_form+"](https://jisho.org/search/"+ element.surface_form + ")"

				}
				editor.setLine(lineCount, output + "\n")

				return true;
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
