function putVariable() {
  const new_var = document.getElementById('new_variable');
  const new_val = document.getElementById('new_value');

  webviewApi.postMessage({
    name: 'PUT',
    key: new_var.value,
    value: new_val.value,
    updated: Date('now'),
  });
}

function deleteVariables() {
  const elements = document.getElementsByClassName('varList')[0];
  const keys = [];

  for (const element of elements) {
    if (element.checked) {
      keys.push(element.id);
    }
  }

  webviewApi.postMessage({
    name: 'DELETE',
    keys: keys,
  });
}
