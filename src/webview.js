function putVariable() {
    const new_var = document.getElementById('new_variable');
    const new_val = document.getElementById('new_value');

    if (new_var.value.indexOf(' ') !== -1){
        document.getElementById('errorMsg').style.visibility = "visible";
    } else {{
        webviewApi.postMessage({
            name: 'PUT',
            key: new_var.value,
            value: new_val.value
        })
    }}

}

function deleteVariables() {
    const elements = document.getElementsByClassName('varList');

    for (const element of elements[0]) {
        if (element.checked) {
            const var_key = element.id;

            webviewApi.postMessage({
                name: 'DELETE',
                key: var_key,
            })
        }
    }
}