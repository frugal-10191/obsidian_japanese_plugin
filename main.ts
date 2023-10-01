import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, MarkdownPostProcessorContext } from 'obsidian';
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

		this.registerMarkdownCodeBlockProcessor("morphology", (source, el, ctx) => this.codeProcessor(source, el, ctx))

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

	async codeProcessor(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) {
		console.log(source);
		//const selected = editor.getSelection();

		console.log(this)
		console.log(this.analyser)
		if (this.analyser == null) {
			console.log("No Analyser: ")
			console.log(this)
			return 
		}
		const result = await this.analyser.parse(source);
		console.log(result)


		// Create Table
		const table = el.createEl("table");

		// Table header
		const head = table.createEl("thead");
		const headrow = head.createEl("tr")
		headrow.createEl("th", {text: "Basic Form"})
		//headrow.createEl("th", {text: "Conjugated Form"})
		//headrow.createEl("th", {text: "Conjugated Type"})
		headrow.createEl("th", {text: "Type"})
		//headrow.createEl("th", {text: "Surface Form"})
		headrow.createEl("th", {text: "Hiragana"})

		const body = table.createEl("tbody");
		for (let i = 0; i < result.length; i++) {
			const row = body.createEl("tr");
	
			const element = result[i];
			let type = element.pos
			let detail1 = element.pos_detail_1
			
			if (type == "名詞") {
				type = "Noun"
				if (detail1 == "形容動詞語幹") {
					type = "Adjectival noun"
					detail1 = ""
				} else if (detail1 == "一般") {
					type = "Universal Adjectival Noun"
					detail1=""
				}
			}
			else if (type == "助詞") {
				type = "Particle"
				if (detail1 == "係助詞") {
					type = "Binding Particle"
					detail1 = ""
				} else if (detail1=="格助詞") {
					type = "Case Marking Particle"
					detail1=""
					if (element.pos_detail_2="一般") {
						type = "Universal Case Marking Particle"
					}
				}
			}
			else if (type == "記号") {
				type = "Symbol"
				if (detail1 == "読点") {
					type = "Comma"
					detail1 = ""
				}
			}
			else if (type == "フィラー") {
				type = "Filler"
			}
			else if (type == "助動詞") {
				type = "Bound Auxillary"

				if (element.conjugated_type.indexOf("特殊")==0) {
					type = "na-Adjective"
					element.conjugated_type=""
				}
				if (element.conjugated_form=="基本形") type += " - Basic Form"
				if (element.conjugated_form=="連用形") type += " - Continuing Form"
				element.conjugated_form=""
			}
			else if (type == "動詞") {
				type = "Verb"
				if (element.conjugated_type.indexOf("五段")==0) {
					type = "Godan Verb"
					element.conjugated_type=""
				}
				if (element.conjugated_form=="基本形") type += " - Basic Form"
				if (element.conjugated_form=="連用形") type += " - Continuing Form"
				element.conjugated_form=""
			} else if (type == "形容詞") {
				type = "Adjective"
				if (element.conjugated_type.indexof("形容詞")==0) {
					type = "i-Adjective"
					element.conjugated_type=""
				}
			} else if (type == "副詞") {
				type = "Adverb"
			} else if (type == "接頭詞") {
				type = "Prefix"
			} else if (type == "連体詞") {
				type = "pre-noun adjectival"
			}
			
			
			row.createEl("td", {text: element.basic_form})
			//row.createEl("td", {text: element.conjugated_form})
			//row.createEl("td", {text: element.conjugated_type})
			row.createEl("td", {text: type})
			//row.createEl("td", {text: element.surface_form})
			row.createEl("td", {text: Kuroshiro.Util.kanaToHiragna(element.pronunciation)})



			/*
			basic_form:  "さやか"
			conjugated_form: "*"
			conjugated_type: "*"
			pos: "名詞"
			pos_detail_1: "形容動詞語幹"
			pos_detail_2: "*"
			pos_detail_3: "*"
			pronunciation: "サヤカ"
			reading: "サヤカ"
			surface_form: "さやか"
			verbose: 
			word_id: 309430
			word_position: 1
			word_type: "KNOWN"
			*/

		}
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
