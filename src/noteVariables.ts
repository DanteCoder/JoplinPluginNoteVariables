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

        
        await settings.register();

        variables = JSON.parse(await joplin.settings.value('variables'));

        await updateNoteVariablesPanel();

        joplin.settings.onChange(async (event: any) => {
            if (event.keys.indexOf('variables') !== -1){
                variables = JSON.parse(await joplin.settings.value('variables'));
            }
        })
        

        await joplin.commands.register({
			name: 'openPopup',
            label: 'Note Variables',
            iconName: 'fas fa-at',
			execute: async () => {
                console.log('testing my command.')
            }
		})

        await joplin.views.toolbarButtons.create('variablesButton', 'openPopup', ToolbarButtonLocation.EditorToolbar);



        async function updateNoteVariablesPanel() {

            const keys = Object.keys(variables).sort();

            const varsHtml = [];


            for (const key of keys){
                console.log(key);
                console.log(variables[key]);
                varsHtml.push(`
                <tr>
                    <td>${key}</td>
                    <td>${variables[key]}</td>
                <tr>`);
            }


            await panels.setHtml(pluginPanel, `
                <div>
                
                    <table>
                        <tr>
                            <th>Variable name</th>
                            <th>Value</th>
                        </tr>
                        ${varsHtml.join('\n')}
                    </table>
                
                </div>
            `)
        }
    }
}