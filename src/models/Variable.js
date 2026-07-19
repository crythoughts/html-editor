import { Serializable } from './Serializable.js';
import { registerType } from '../storage.js';

/**
 * Variable — a typed variable inside a Component.
 *
 * @property {string} name     — variable identifier
 * @property {string} type     — data type: 'str' (default) or 'int'
 * @property {*}      default  — fallback value when no override is provided
 */
export class Variable extends Serializable {
  constructor(name = '', type = 'str', defaultVal = '') {
    super();
    this.name = name;
    this.type = type;
    this.default = defaultVal;
  }
}

registerType('Variable', Variable);
