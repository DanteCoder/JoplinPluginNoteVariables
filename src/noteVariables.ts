import joplin from "api";
import { settings } from "./settings";
import { ToolbarButtonLocation, ContentScriptType } from "api/types";

export namespace noteVariables {

    let variables = null;
    let prefix_suffix = null;
    let pluginPanel = null;
    let is_panel_shown = false;
    const panels = joplin.views.panels;
    const dialogs = joplin.views.dialogs;
    let handle_bad_vars_note = null;
    let please_dont_recurse = false;

    export async function init() {
        console.log('Note Variables plugin started!');

        await settings.register();

        joplin.settings.onChange(async (event) => {
            if (event.keys.indexOf('variablePrefixSufix') !== -1) {
                const setting_value = await joplin.settings.value('variablePrefixSufix');
                const note_value = variables.config.prefix_suffix;

                if (setting_value !== note_value){
                    variables.config.prefix_suffix = setting_value;
                    updateVariablesSetting();
                    console.log('1 I updated the variables setting');
                } else {
                    console.log('1 I didnt do anything');
                }
            }

            if (event.keys.indexOf('variables') !== -1) {
                console.log('The variables setting was updated');
                vars2localstrg();
                localStorage.setItem('pluginNoteSettingsChanged', 'true');
                
                const setting_value = await joplin.settings.value('variablePrefixSufix');
                const note_value = variables.config.prefix_suffix;

                if (setting_value !== note_value){
                    await joplin.settings.setValue('variablePrefixSufix', note_value);
                    console.log('2 I updated the variablePrefixSufix setting');
                } else {
                    console.log('2 I didnt do anything');
                }

                updateVariablesNote(true);
            }
            
        })

        //Get the variables from the setting value and set it to localStorage
        const stringy_vars = await joplin.settings.value('variables');
        variables = JSON.parse(stringy_vars);
        localStorage.setItem('noteVariables', stringy_vars);
        
        // Create a dialog to handle bad variables note
		handle_bad_vars_note = await dialogs.create('badVars');
		await dialogs.setHtml(handle_bad_vars_note, `
        <div style="text-align:justify;">
            <p>The plugin couldn't parse the variables note.</p>
            <p>Do you want to overwrite the note with the local variables or do nothing?</p>
        </div>`);
        await dialogs.setButtons(handle_bad_vars_note, [
			{
				id: 'Overwrite',
			},
			{
				id: 'Do nothing',
			}
		]);

        await updateVariablesNote(false);

        //Create the plugin panel
        pluginPanel = await panels.create('panel_1');
        await panels.hide(pluginPanel);
        await panels.setHtml(pluginPanel, 'Loading... :)');
        await panels.addScript(pluginPanel, './webview.js')

        await panels.onMessage(pluginPanel, (message: any) => {
            if (message.name === 'PUT') {
                variables[message.key] = message.value;
                updateVariablesSetting();
                updateNoteVariablesPanel();
            }

            if (message.name === 'DELETE') {
                delete variables[message.key];
                updateVariablesSetting();
                updateNoteVariablesPanel();
            }
        })

        await updateNoteVariablesPanel();

        await joplin.commands.register({
            name: 'togglePanel',
            label: 'Show/Hide Variables panel',
            iconName: 'fas fa-superscript',
            execute: async () => {
                if (is_panel_shown) {
                    await panels.hide(pluginPanel);
                    is_panel_shown = false;
                } else {
                    await panels.show(pluginPanel);
                    is_panel_shown = true;
                }
            }
        })

        await joplin.views.toolbarButtons.create('variablesButton', 'togglePanel', ToolbarButtonLocation.EditorToolbar);

        await joplin.contentScripts.register(
            ContentScriptType.MarkdownItPlugin,
            'markdown',
            './markdownItPlugin.js'
        )
    }
    async function updateVariablesSetting() {
        const stringy_vars = JSON.stringify(variables);
        await joplin.settings.setValue('variables', stringy_vars);
    }

    function vars2localstrg(){
        const stringy_vars = JSON.stringify(variables);
        localStorage.setItem('noteVariables', stringy_vars);
    }

    async function updateNoteVariablesPanel() {
        const keys = Object.keys(variables).sort();
        const varsHtml = [];

        for (const key of keys) {
            varsHtml.push(`
            <tr>
                <td><input type="checkbox" id="${key}" name="${key}" value="1"></td>
                <td id="var_${key}">${key}</td>
                <td>${variables[key]}</td>
            <tr>`);
        }

        await panels.setHtml(pluginPanel, `
                <form id="deleteVars" action="javascript:;" onsubmit="deleteVariables()" class="varList">
                    <div>
                        <table>
                            <tr>
                                <th></th>
                                <th>Variable name</th>
                                <th>Value</th>
                            </tr>
                            ${varsHtml.join('\n')}
                        </table>
                        <input type="submit" id="delete_vars_button" value="Delete selected">
                    </div>
                </form>
                <form id="createVar" name="createVar" action="javascript:;" onsubmit="putVariable()">
                    <div>
                        <table>
                            <tr><td>
                                <input type="text" id="new_variable" name="new_variable" placeholder="New variable">
                            </tr>
                            <tr><td>
                                <input type="text" id="new_value" name="new_value" placeholder="Value">
                            <td/></tr>
                            <tr><td>
                                <input type="button" value="Add/Update variable" id="new_var_button" onClick="putVariable()">
                            <td/></tr>
                            <tr><td>
                                <p id="errorMsg" style="visibility: hidden">
                                    Variables must not contain spaces
                                <p/>
                            <td/></tr>
                        </table>
                    </div>
                </form>
        `)
    }

    async function updateVariablesNote(push: boolean) {
        const result = await joplin.data.get(['search'], {query:`title:%NoteVariables%`, field:['title'] })

        // If there is already a note named "%NoteVariables%" it will pull/push variables from it
        if (result.items.length !== 0){
            const variablesNote = await joplin.data.get(['notes', result.items[0].id], {fields: ['id', 'body']})
            
            if (push){
                await joplin.data.put(['notes', variablesNote.id], null, {body: JSON.stringify(variables, null, '\t')});
                console.log('1 pushed local variables into variables note');
            } else {
    
                // Try to parse variables from the note
                let json_vars = null;
                try {
                    json_vars = JSON.parse(variablesNote.body);
                    const keys = Object.keys(json_vars);

                    // Check if the variables note has the two main keys
                    if (keys.indexOf('vars') === -1 || keys.indexOf('config') === -1){
                        throw 'The variables note doesn\'t have the "vars" and "config" keys' 
                    }
                }catch (e){
                    console.log(e);
                }
    
                // Get the variables from the note "%NoteVariables%" into local variables
                if (json_vars !== null){
                    console.log('pulled variables note variables into local variables')
                    variables = json_vars;
                    updateVariablesSetting();
    
                // If there was an error opening the variables note, it will ask if you want to push local variables or do nothing
                } else {
                    const result = await dialogs.open(handle_bad_vars_note);
                    if (result.id === 'Overwrite'){
                        console.log('2 pushed local variables in to variables note');
                        await joplin.data.put(['notes', variablesNote.id], null, {body: JSON.stringify(variables, null, '\t')});
                    }
                }
            }

        // If there is no note named "%NoteVariables%", it will create one and push the variables locally stored
        } else {
            await joplin.data.post(['notes'], null, {
                body: JSON.stringify(variables, null, '\t'),
                title: '%NoteVariables%'
            })
            console.log('created new variables note and pushed local variables')
        }
    }
}