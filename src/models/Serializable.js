/**
 * Serializable — base class providing recursive JSON serialization/deserialization.
 *
 * Subclasses automatically get toJSON() which walks all enumerable own properties
 * and converts nested Serializable instances and arrays thereof.
 *
 * Deserialization is handled externally via a type registry (see storage.js).
 */
export class Serializable {
  /**
   * Returns a plain object representation of this instance.
   * Recursively serializes nested Serializable instances and arrays.
   */
  toJSON() {
    const obj = {};
    for (const key of Object.keys(this)) {
      const value = this[key];
      if (value instanceof Serializable) {
        obj[key] = value.toJSON();
      } else if (Array.isArray(value)) {
        obj[key] = value.map((item) =>
          item instanceof Serializable ? item.toJSON() : item,
        );
      } else if (value !== undefined && value !== null) {
        obj[key] = value;
      }
    }
    obj._type = this.constructor.name;
    return obj;
  }
}
