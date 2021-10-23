import joplin from "api";
import { settings } from "./settings";
import { ToolbarButtonLocation, ContentScriptType } from "api/types";

export namespace noteVariables {

    let variables = null;
    const panels = joplin.views.panels;
    let pluginPanel = null;

    let is_panel_shown = false;

    export async function init() {
        console.log('Note Variables plugin started!');

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

            console.log(variables);
        })

        await settings.register();

        variables = JSON.parse(await joplin.settings.value('variables'));
        localStorage.setItem('noteVariables', JSON.stringify(variables));

        await updateNoteVariablesPanel();

        await joplin.commands.register({
            name: 'togglePanel',
            label: 'Show/Hide Variables panel',
            iconName: 'fas fa-at',
            execute: async () => {
                if (is_panel_shown){
                    await panels.hide(pluginPanel);
                    is_panel_shown = false;
                }else{
                    await panels.show(pluginPanel);
                    is_panel_shown = true;
                }
                console.log('testing my command.')
            }
        })

        await joplin.views.toolbarButtons.create('variablesButton', 'togglePanel', ToolbarButtonLocation.EditorToolbar);


        await joplin.contentScripts.register(
            ContentScriptType.MarkdownItPlugin,
            'markdown',
            './markdownItPlugin.js'
        )

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
                console.log(key);
                console.log(variables[key]);
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
                            <input type="submit" id="delete_vars_button" value="Delete selected" onClick="console.log('click delete')">
                        </div>
                    </form>
                    <form id="createVar" name="createVar" action="javascript:;" onsubmit="putVariable()">
                        <div>
                            <table>
                                <tr>
                                    <td><input type="text" id="new_variable" name="new_variable" placeholder="New variable"></td>
                                    <td><input type="text" id="new_value" name="new_value" placeholder="Value"></td>
                                    <td><input type="submit" id="new_var_button" value="Add variable" onClick="console.log('click add var')"></td>
                                </tr>
                            </table>
                        </div>
                    </form>
            `)
        }
    }
}