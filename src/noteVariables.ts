import joplin from "api";
import { settings } from "./settings";
import { ToolbarButtonLocation, ContentScriptType } from "api/types";

export namespace noteVariables {

    let variables = null;
    let pluginPanel = null;
    let is_panel_shown = false;
    const panels = joplin.views.panels;

    export async function init() {
        console.log('Note Variables plugin started!');

        await settings.register();

        joplin.settings.onChange(async (event) => {
            if (event.keys.indexOf('variablePrefixSufix') !== -1) {
                localStorage.setItem('variablePrefixSufix', await joplin.settings.value('variablePrefixSufix'));
                localStorage.setItem('pluginNoteSettingsChanged', 'true');
            }
        })

        //Get the variables from the setting value and set it to localStorage
        const stringy_vars = await joplin.settings.value('variables');
        variables = JSON.parse(stringy_vars);
        localStorage.setItem('noteVariables', stringy_vars);

        const prefix_sufix = await joplin.settings.value('variablePrefixSufix');
        localStorage.setItem('variablePrefixSufix', prefix_sufix);

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
        localStorage.setItem('noteVariables', stringy_vars);
        localStorage.setItem('pluginNoteVariablesUpdated', 'true');
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
}