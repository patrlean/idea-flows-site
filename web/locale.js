import {site} from './site.js';
import {createTranslator} from './i18n.js';
export const t=createTranslator(site.language||'zh-CN');
