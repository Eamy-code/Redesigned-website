document.querySelectorAll('[data-static-form]').forEach(form => {
  const checkButton = form.querySelector('[data-check-form]');
  const status = form.querySelector('[data-form-status]');

  form.addEventListener('submit', event => {
    event.preventDefault();
  });

  checkButton.hidden = false;
  checkButton.addEventListener('click', () => {
    status.textContent = '';
    if (!form.reportValidity()) return;
    status.textContent = '必須項目と入力形式を確認しました。送信機能は未接続のため、まだ送信されていません。';
  });

  form.addEventListener('input', () => {
    status.textContent = '';
  });
});
