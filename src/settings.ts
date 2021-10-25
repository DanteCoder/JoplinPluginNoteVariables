import joplin from "api";
import { SettingItemType } from "api/types";

export namespace settings {

    export async function register() {
        await joplin.settings.registerSection('noteVariablesSection', {
            label: "Note Variables",
        });

        await joplin.settings.registerSettings({
            'variables': {
                value: '{}',
                type: SettingItemType.String,
                section: 'noteVariablesSection',
                public: false,
                label: 'Variables'
            },

            'variablePrefixSufix': {
                value: '%',
                type: SettingItemType.String,
                section: 'noteVariablesSection',
                public: true,
                label: 'Variable prefix/suffix',
                description: 'If the prefix/suffix is "%", you will need to type %NameOfYourVar% to use it on your notes'
            }
        })
    }
}