import joplin from "api";
import { settings } from "./settings";
import { ToolbarButtonLocation } from "api/types";

export namespace noteVariables {

    let variables = {};
    const dialogs = joplin.views.dialogs;
    const panels = joplin.views.panels;
    let pluginPanel = null;

    export async function init() {
        console.log('Note Variables plugin started!');
        
        
        
        
        
        const handle = await dialogs.create('myDialog1');
		await dialogs.setHtml(handle, '<p>Testing dialog with default buttons</p><p>Second line</p><p>Third linexxx</p>');
		
        
        
        
        
        
        pluginPanel = await panels.create('panel_1');

        await panels.setHtml(pluginPanel, 'Loading... :)');

        await updateNoteVariablesPanel();

        await settings.register();

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
                const result = await dialogs.open(handle);
		        console.info('Got result: ' + JSON.stringify(result));
            }
		})

        await joplin.views.toolbarButtons.create('variablesButton', 'openPopup', ToolbarButtonLocation.EditorToolbar);



        async function updateNoteVariablesPanel() {
            await panels.setHtml(pluginPanel, `
                <div>
                
                    <table>
                        <tr>
                            <th>Variable name</th>
                            <th>Value</th>
                        </tr>
                    
                    
                    </table>
                
                </div>
            `)
        }
    }
}