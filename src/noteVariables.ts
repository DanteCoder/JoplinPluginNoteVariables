import joplin from "api";
import { settings } from "./settings";
import { ToolbarButtonLocation, ContentScriptType } from "api/types";

export namespace noteVariables {

    const note_template = <any>{
        vars: {}
    }

    let noteVarsId = null;
    let last_note_id = null;
    let runtimeVariables = note_template;
    let sync_mode = null;
    let pluginPanel = null;
    let is_panel_shown = false;
    const panels = joplin.views.panels;
    const dialogs = joplin.views.dialogs;
    let handle_bad_vars_note = null;

    export async function init() {
        console.log('Note Variables plugin started!');

        await settings.register();
        sync_mode = await joplin.settings.value('syncMode')

        await joplin.settings.onChange(async (event) => {
            
        })

        await joplin.workspace.onNoteChange(async (event) => {
            console.log('Note changed.')
        })

        await joplin.workspace.onNoteSelectionChange(async () => {
            const current_note = await joplin.workspace.selectedNote();

            if (current_note.id !== noteVarsId && last_note_id === noteVarsId){
                await syncData(sync_mode);
            }

            last_note_id = current_note.id;
        })

        await joplin.workspace.onSyncComplete(async () => {

        })
        
        // Create a dialog to handle bad variables note
		handle_bad_vars_note = await dialogs.create('badVars');
		await dialogs.setHtml(handle_bad_vars_note, `
        <div style="text-align:justify;">
            <p>There is a SyntaxError in the %NoteVariables% note</p>
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

        // Pull variables from variables note or create if doesn't exist
        //await syncData(sync_mode);

        //Create the plugin panel
        pluginPanel = await panels.create('panel_1');
        await panels.hide(pluginPanel);
        await panels.setHtml(pluginPanel, 'Loading... :)');
        await panels.addScript(pluginPanel, './webview.js')

        await panels.onMessage(pluginPanel, (message: any) => {
            if (message.name === 'PUT') {
                runtimeVariables[message.key] = message.value;
                updateNoteVariablesPanel();
            }

            if (message.name === 'DELETE') {
                delete runtimeVariables[message.key];
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

    async function updateNoteVariablesPanel() {
        const keys = Object.keys(runtimeVariables).sort();
        const varsHtml = [];

        for (const key of keys) {
            varsHtml.push(`
            <tr>
                <td><input type="checkbox" id="${key}" name="${key}" value="1"></td>
                <td id="var_${key}">${key}</td>
                <td>${runtimeVariables[key]}</td>
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

    //This function syncs the %NoteVariables% with variables and localstorage['noteVariables']
    async function syncData(sync_type:string) {
        console.log('----sync started----');

        // Get the lsVariables
        let lsVariables = localStorage.getItem('lsVariables');
        if (lsVariables === null){
            lsVariables = note_template;
        } else {
            try {
                lsVariables = JSON.parse(lsVariables);
                lsVariables = checkVarsIntegrity(lsVariables);
                
            } catch (e) {
                console.log('error parsing lsVariables')
                console.log(e);
                lsVariables = note_template;
            }
        }
        runtimeVariables = lsVariables;

        const noteIntegrity = await checkNoteIntegrity();

        console.log('integrity check finished');
        console.log(noteIntegrity);

        if (!noteIntegrity.integrity){
            console.log('The note does not have integrity')

            if (noteIntegrity.error.name === 'SyntaxError'){
                console.log('SyntaxError');
            }

            const result = await dialogs.open(handle_bad_vars_note);

            if (result.id === 'Overwrite'){
                await joplin.data.put(['notes', noteIntegrity.noteId], null, {body: JSON.stringify(lsVariables, null, '\t')});
            }else{
                return;
            }

        }

        const note = await joplin.data.get(['notes', noteIntegrity.noteId], {fields: ['id', 'body']});

        if (sync_type === 'two_way'){
            console.log('two_way syncing');
            const noteVariables = JSON.parse(note.body);
            
            console.log(noteVariables);

            const note_vars_keys = Object.keys(noteVariables.vars);
            console.log('pulling variables from note');
            for (let key of note_vars_keys){
                // If the variable already exists --pull-- only if it's more recent
                if (typeof runtimeVariables.vars[key] !== 'undefined'){
                    if (noteVariables.vars[key].updated > runtimeVariables.vars[key].updated){
                        runtimeVariables.vars[key] = noteVariables.vars[key];
                        console.log(`pulled ${key} from note`);
                    }
                }else{
                    runtimeVariables.vars[key] = noteVariables.vars[key];
                    console.log(`pulled ${key} from note`);
                }
            }

            console.log('pushing variables to note');
            const local_vars_keys = Object.keys(runtimeVariables.vars);
            for (let key of local_vars_keys){
                // If the variable already exists --push-- only if it's more recent
                if (typeof noteVariables.vars[key] !== 'undefined'){
                    if (runtimeVariables.vars[key].updated > noteVariables.vars[key].updated){
                        noteVariables.vars[key] = runtimeVariables.vars[key];
                        console.log(`pushed ${key} to note`);
                    }
                }else{
                    noteVariables.vars[key] = runtimeVariables.vars[key];
                    console.log(`pushed ${key} to note`);
                }
            }

            await joplin.data.put(['notes', note.id], null, {body: JSON.stringify(runtimeVariables, null, '\t')});
        }

        localStorage.setItem('lsVariables', JSON.stringify(runtimeVariables));
        localStorage.setItem('pluginNoteVariablesUpdate', 'true');

        console.log('----sync finished----')
    }

    // Checks if the note exists, and the integrity of the note
    async function checkNoteIntegrity(){
        const result = await joplin.data.get(['search'], {query:`title:%NoteVariables%`, field:['title'] });

        let noteId = null;

        if (result.items.length === 0){
            // Create a new clean note
            await joplin.data.post(['notes'], null, {
                body: JSON.stringify(note_template, null, '\t'),
                title: '%NoteVariables%'
            })

            const result = await joplin.data.get(['search'], {query:`title:%NoteVariables%`, field:['title'] });
            noteId = result.items[0].id;

            return {noteId: noteId, integrity:true, error: null};

        } else if (result.items.length === 1) {
            noteId = result.items[0].id;

        } else if (result.items.length > 1){
            // Use the first result and rename the other notes.
            noteId = result.items[0].id;
            for (let i = 1; i < result.items.length; i++){
                joplin.data.put(['notes', result.items[i].id], null, {title: '%NoteVariables% UNUSED'});
            }
        }
        noteVarsId = noteId;

        // Run the check normally and try to fix integrity
        console.log('running integrity check');
        let body = null;
        try {
            const note = await joplin.data.get(['notes', noteId], {fields: ['id', 'body']});
            body = note.body;

            let parsed_json = JSON.parse(body);

            const good_json = checkVarsIntegrity(parsed_json);

            // Save changes to note
            await joplin.data.put(['notes', noteId], null, {body: JSON.stringify(good_json, null, '\t')});

            return {noteId: noteId, integrity:true, error: null};
        } catch (e) {
            return {noteId: noteId, integrity:false, error: e};
        }
    }

    function checkVarsIntegrity(vars_object: any){
        const keys = Object.keys(vars_object);

        if (keys.indexOf('vars') === -1){
            vars_object.vars = {};

            for (const key of keys){
                vars_object.vars[key] = vars_object[key];
                delete vars_object[key];
            }
        }

        const var_keys = Object.keys(vars_object.vars);
        if (var_keys.length > 0){
            // Check if each var has value and updated property
            for (const key of var_keys){

                if (typeof vars_object.vars[key] !== 'object'){
                    const var_value = vars_object.vars[key];
                    delete vars_object.vars[key];
                    vars_object.vars[key] = {};

                    vars_object.vars[key].value = var_value;
                    vars_object.vars[key].updated = Date.now();

                    continue;
                }
                
                if (vars_object.vars[key]['value'] === null){
                    const var_value = vars_object.vars[key];
                    delete vars_object.vars[key];
                    vars_object.vars[key] = {};
                    vars_object.vars[key].value = var_value;
                }

                if (vars_object.vars[key]['updated'] === null){
                    vars_object.vars[key].updated = Date.now();
                }
            }
        }

        return vars_object;
    }
}