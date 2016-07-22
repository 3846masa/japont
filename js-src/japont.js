/* globals HTMLElement:false, fetch:false */
import isReady from './lib/is-ready';
import 'whatwg-fetch';

class HTMLJapontElement extends HTMLElement {
  createdCallback () {
    this._attached = false;
  }

  attachedCallback () {
    this._attached = true;

    const fontName = this.getAttribute('src');
    const selector = this.getAttribute('selector');
    const alias = this.getAttribute('alias');

    if (!fontName) return;
    isReady().then(() => {
      this._sendRequest(fontName, selector, alias);
    });
  }

  detachedCallback () {
    this._attached = false;

    if (this.fontElement) {
      this.fontElement.parentNode.removeChild(this.fontElement);
    }
    if (this.styleElement) {
      this.styleElement.parentNode.removeChild(this.styleElement);
    }

    this.fontElement = this.styleElement = null;
  }

  attributeChangedCallback (attrName, oldVal, newVal) {
    if (!this._attached) return;

    const fontName = this.getAttribute('src');
    const selector = this.getAttribute('selector');
    const alias = this.getAttribute('alias');

    if (attrName === 'alias') {
      this._setFont(alias, selector);
    } else if (attrName === 'src' || attrName === 'selector') {
      isReady().then(() => {
        this._sendRequest(fontName, selector, alias);
      });
    }
  }

  reload () {
    const fontName = this.getAttribute('src');
    const selector = this.getAttribute('selector');
    const alias = this.getAttribute('alias');
    if (!fontName) return;
    isReady().then(() => {
      this._sendRequest(fontName, selector, alias);
    });
  }

  _sendRequest (fontName, selector = '*', alias = '') {
    if (!fontName) return;

    const targetNodes =
      (!selector)
      ? [ document.documentElement ]
      : Array.from(document.querySelectorAll(selector));

    if (!targetNodes || targetNodes.length === 0) {
      throw new Error(`Selector "${selector}" is not matched.`);
    }

    const content =
      targetNodes.map((el) => el.textContent).join('').replace(/[\r\n]/g, '');
    const charArr = this._uniqueChars(content);

    fetch('//{{HEROKU_URL}}/font.css', {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: charArr.join(''),
        fontName: fontName,
        fontFamily: alias
      })
    }).then((res) => {
      if (res.status !== 200) {
        this._emit('error');
        const _err = new Error(`Can't read font file : ${res.statusText}`);
        return Promise.reject(_err);
      }
      return res.text();
    })
    .then((css) => {
      if (this.fontElement) {
        this.fontElement.parentNode.removeChild(this.fontElement);
      }

      this.fontName = css.split('\n')[1];
      const fontNode = document.createElement('style');
      const textNode = document.createTextNode(css);
      fontNode.setAttribute('class', 'japont-face');
      fontNode.appendChild(textNode);
      this.fontElement = fontNode;
      this.appendChild(fontNode);

      this._emit('load');
      this._setFont(alias, selector);
    });
  }

  _setFont (alias, selector) {
    if (this.fontElement) {
      let fontCss = this.fontElement.textContent;
      alias = alias || this.fontName || 'undefined';
      fontCss =
        fontCss.replace(/font-family: '[^']*'/, `font-family: '${alias}'`);
      this.fontElement.textContent = fontCss;
    }

    if (this.styleElement) {
      this.styleElement.parentNode.removeChild(this.styleElement);
    }
    const styleText = `${selector} { font-family: "${alias}"; }`;
    const styleNode = document.createElement('style');
    const textNode = document.createTextNode(styleText);
    styleNode.setAttribute('class', 'japont-face');
    styleNode.appendChild(textNode);
    this.styleElement = styleNode;
    this.appendChild(styleNode);
  }

  _emit (eventName) {
    const ev = document.createEvent('HTMLEvents');
    ev.initEvent(eventName, false, false);
    this.dispatchEvent(ev);
  }

  _uniqueChars (str) {
    const arr = str.split('');
    let o = {};
    let l = arr.length;
    for (let i = 0; i < l; i++) {
      o[arr[i]] = 1;
    }
    return Object.keys(o);
  }
}

document.registerElement('japont-config', HTMLJapontElement);
window.HTMLJapontElement = HTMLJapontElement;
