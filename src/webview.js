function putVariable() {
    const new_var = document.getElementById('new_variable');
    const new_val = document.getElementById('new_value');

    webviewApi.postMessage({
        name: 'PUT',
        key: new_var.value,
        value: new_val.value
    })

    console.log(new_var.value);
    console.log(new_val.value);
}

function deleteVariables() {

    const elements = document.getElementsByClassName('varList');
    console.log("elements:")
    console.log(elements);

    for (const element of elements[0]) {
        if (element.checked) {
            const var_key = element.id;

            webviewApi.postMessage({
                name: 'DELETE',
                key: var_key,
            })

            console.log(`Variable ${var_key} deleted`);
        }
    }
}