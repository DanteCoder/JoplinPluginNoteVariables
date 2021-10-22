import joplin from "api";
import { settings } from "./settings";
import { ToolbarButtonLocation } from "api/types";

export namespace noteVariables {

    let variables = null;
    const panels = joplin.views.panels;
    let pluginPanel = null;

    export async function init() {
        console.log('Note Variables plugin started!');
        
        pluginPanel = await panels.create('panel_1');

        await panels.setHtml(pluginPanel, 'Loading... :)');
        await panels.addScript(pluginPanel, './webview.js')

        await panels.onMessage(pluginPanel, (message:any) => {
            if (message.name === 'PUT'){
                variables[message.key] = message.value;
                updateVariablesSetting();
                
            }
            if (message.name === 'DELETE'){
                delete variables[message.key];
                updateVariablesSetting();
            }

            console.log(variables);
        })
        
        await settings.register();

        variables = JSON.parse(await joplin.settings.value('variables'));

        await updateNoteVariablesPanel();

        /* joplin.settings.onChange(async (event: any) => {
            if (event.keys.indexOf('variables') !== -1){
                variables = JSON.parse(await joplin.settings.value('variables'));
            }
        }) */

        await joplin.commands.register({
			name: 'togglePanel',
            label: 'Note Variables',
            iconName: 'fas fa-at',
			execute: async () => {
                console.log('testing my command.')
            }
		})

        await joplin.views.toolbarButtons.create('variablesButton', 'togglePanel', ToolbarButtonLocation.EditorToolbar);

        async function updateVariablesSetting() {
            await joplin.settings.setValue('variables', JSON.stringify(variables));
        }

        async function updateNoteVariablesPanel() {

            const keys = Object.keys(variables).sort();

            const varsHtml = [];


            for (const key of keys){
                console.log(key);
                console.log(variables[key]);
                varsHtml.push(`
                <tr>
                    <td><input type="checkbox" id="${key}" name="${key}" value="1"></td>
                    <td>${key}</td>
                    <td>${variables[key]}</td>
                <tr>`);
            }


            await panels.setHtml(pluginPanel, `
                    <form id="deleteVars">
                        <div>
                            <table>
                                <tr>
                                    <th></th>
                                    <th>Variable name</th>
                                    <th>Value</th>
                                </tr>
                                ${varsHtml.join('\n')}
                            </table>
                        </div>
                    </form>
                    <form id="createVar" name="createVar" action="javascript:;" onsubmit="putVariable()">
                        <div>
                            <table>
                                <tr>
                                    <td><input type="text" id="new_variable" name="new_variable" placeholder="New variable"></td>
                                    <td><input type="text" id="new_value" name="new_value" placeholder="Value"></td>
                                    <td><input type="submit" id="new_var_button" value="Add variable" onClick="console.log('click')"></td>
                                </tr>
                            </table>
                        </div>
                    </form>
            `)
        }
    }
}