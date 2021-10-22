import joplin from "api";
import { SettingItemType } from "api/types";

export namespace settings {

    export async function register() {
        await joplin.settings.registerSection('noteVariablesSection', {
            label: "Note Variables",
        });


        await joplin.settings.registerSettings({
            'variables': {
                value: '{"a":"somestring","x":42,"c":false}',
                type: SettingItemType.String,
                section: 'noteVariablesSection',
                public: false,
                label: 'Variables'
            }
        })




    }


}