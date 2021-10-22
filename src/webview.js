function putVariable(){
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