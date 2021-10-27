import joplin from "api";
import { SettingItemType } from "api/types";

export namespace settings {

    export async function register() {
        await joplin.settings.registerSection('noteVariablesSection', {
            label: "Note Variables",
        });

        await joplin.settings.registerSettings({
            'syncMode': {
                value: 'two_way',
                type: SettingItemType.String,
                section: 'noteVariablesSection',
                public: true,
                label: 'Sync mode',
                isEnum: true,
                description: 'Two way: compares local and cloud variables and updates the lastest changes.',
                options: {
                    'two_way':'Two way'
                }
            },

            'fence': {
                value: '%',
                type: SettingItemType.String,
                section: 'noteVariablesSection',
                public: true,
                label: 'Variable fence',
                description: 'If the fence is "%", you will need to type %NameOfYourVar% to use it on your notes'
            }
        })
    }
}