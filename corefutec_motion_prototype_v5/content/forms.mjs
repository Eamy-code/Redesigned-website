const escape = text => String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

export const contactForms = {
  contact: {
    label: 'お問い合わせフォーム',
    fields: [
      {
        name: 'inquiryType',
        label: 'お問合せ種別',
        type: 'radio',
        required: true,
        options: ['資料請求', 'お見積りご依頼', 'その他お問合せ']
      },
      {
        name: 'nameKana',
        label: 'お名前(フリガナ)',
        type: 'text',
        required: true,
        placeholder: '例：ヤマダ タロウ'
      },
      {
        name: 'name',
        label: 'お名前(漢字)',
        type: 'text',
        required: true,
        placeholder: '例：山田 太郎',
        autocomplete: 'name'
      },
      {
        name: 'company',
        label: '会社名',
        type: 'text',
        placeholder: '例：コアフューテック(株)',
        autocomplete: 'organization'
      },
      {
        name: 'address',
        label: 'ご住所',
        type: 'text',
        placeholder: '例：211-0004 神奈川県 川崎市中原区新丸子東2-888 KTSビル 2F',
        autocomplete: 'street-address'
      },
      {
        name: 'phone',
        label: '電話番号',
        type: 'tel',
        required: true,
        placeholder: '例：044-430-5501',
        autocomplete: 'tel'
      },
      {
        name: 'fax',
        label: 'FAX',
        type: 'tel',
        placeholder: '例：044-430-5502'
      },
      {
        name: 'email',
        label: 'メールアドレス',
        type: 'email',
        required: true,
        placeholder: '例：contact@corefutec.co.jp',
        autocomplete: 'email'
      },
      {
        name: 'message',
        label: 'お問合せ内容',
        type: 'textarea',
        required: true,
        placeholder: 'お問合せ内容をご記入ください。'
      }
    ]
  },
  entry: {
    label: '採用応募・お問い合わせフォーム',
    fields: [
      {
        name: 'applicationType',
        label: '応募種別',
        type: 'radio',
        required: true,
        options: ['新卒', '二次新卒(社会人経験~3年程度)', 'キャリア(中途)']
      },
      {
        name: 'birthYear',
        label: '生まれた年(西暦)',
        type: 'number',
        min: 1960,
        max: 2015,
        placeholder: '2001'
      },
      {
        name: 'gender',
        label: '性別',
        type: 'radio',
        options: ['男性', '女性', '回答せず']
      },
      {
        name: 'nameKana',
        label: 'お名前(フリガナ)',
        type: 'text',
        required: true,
        placeholder: '例：ヤマダ タロウ'
      },
      {
        name: 'name',
        label: 'お名前(漢字)',
        type: 'text',
        required: true,
        placeholder: '例：山田 太郎',
        autocomplete: 'name'
      },
      {
        name: 'occupation',
        label: '現在の職業',
        type: 'radio',
        required: true,
        options: ['学生', 'アルバイト・パート', '会社員', '個人事業主', 'その他']
      },
      {
        name: 'address',
        label: 'ご住所',
        type: 'text',
        placeholder: '例：211-0004 神奈川県 川崎市中原区新丸子東2-888 KTSビル 2F',
        autocomplete: 'street-address'
      },
      {
        name: 'phone',
        label: '電話番号',
        type: 'tel',
        required: true,
        placeholder: '例：044-430-5501',
        autocomplete: 'tel'
      },
      {
        name: 'email',
        label: 'メールアドレス',
        type: 'email',
        required: true,
        placeholder: '例：core_saiyo@corefutec.co.jp',
        autocomplete: 'email'
      },
      {
        name: 'message',
        label: 'その他／お問合せ',
        type: 'textarea',
        required: true,
        placeholder: 'お問合せ内容をご記入ください。'
      }
    ]
  }
};

export function contactForm(key) {
  const form = contactForms[key];
  const fields = form.fields.map(field => {
    const id = `${key}-${field.name}`;
    const label = `${escape(field.label)}（${field.required ? '必須' : '任意'}）`;
    const required = field.required ? ' required' : '';
    if (field.type === 'radio') {
      return `<fieldset><legend>${label}</legend>${field.options.map((option, index) => `<p><label><input type="radio" name="${field.name}" value="${escape(option)}"${required}${index === 0 ? ' checked' : ''}> ${escape(option)}</label></p>`).join('')}</fieldset>`;
    }
    const attributes = `id="${id}" name="${field.name}"${required} placeholder="${escape(field.placeholder)}"${field.autocomplete ? ` autocomplete="${field.autocomplete}"` : ''}`;
    const input = field.type === 'textarea'
      ? `<textarea ${attributes} cols="30" rows="8"></textarea>`
      : `<input type="${field.type}" ${attributes}${field.min !== undefined ? ` min="${field.min}" max="${field.max}"` : ''}>`;
    return `<p><label for="${id}">${label}</label><br>${input}</p>`;
  }).join('\n');
  return `<form aria-label="${form.label}" data-static-form>
${fields}
<p><label><input type="checkbox" name="privacyConsent" value="1" required> <a href="https://www.corefutec.co.jp/privacy-policy/">個人情報保護に関する基本方針</a>に同意します（必須）</label></p>
<p><button type="button" data-check-form hidden>入力内容を確認する</button> <button type="submit" disabled>この内容で送信する（準備中）</button></p>
<p role="status" aria-live="polite" data-form-status></p>
</form>`;
}
