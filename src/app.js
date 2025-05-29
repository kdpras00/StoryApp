import Model from './model.js';
import View from './view.js';
import Presenter from './presenter.js';

// Inisialisasi aplikasi
document.addEventListener('DOMContentLoaded', () => {
  const model = new Model();
  const view = new View();
  const presenter = new Presenter(model, view);
});