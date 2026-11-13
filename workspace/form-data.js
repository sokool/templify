/* Catalogue order only. Field markup, defaults and documentation live in exportable templates. */
(function (root) {
  'use strict';
  root.ExampleFormData = {
    groups: [
      { id: 'text', label: 'Text', types: ['text', 'password', 'email', 'tel', 'url', 'search', 'textarea'] },
      { id: 'numbers', label: 'Numbers & slider', types: ['number', 'quantity', 'range'] },
      { id: 'dates', label: 'Date & time', types: ['date', 'time', 'datetime-local', 'month', 'week'] },
      { id: 'choices', label: 'Checkbox, radio & switch', types: ['checkbox', 'radio', 'switch'] },
      { id: 'lists', label: 'Selects & suggestions', types: ['select', 'multiselect', 'suggestions'] },
      { id: 'other', label: 'File, colour & hidden value', types: ['file', 'color', 'hidden'] },
    ],
  };
})(globalThis);
