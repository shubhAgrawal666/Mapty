'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const btnDeleteAll = document.querySelector('.btn--delete-all');
let map, mapEvent;
class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;
  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }
  _setDecription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    // prettier-ignore
    this.description = `${this.type[0].toUpperCase() + this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
  }
  // click() {
  //   this.clicks++;
  // }
}
class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDecription();
    // console.log(this.description);
  }
  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}
class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDecription();
    // console.log(this.description);
  }
  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}
// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cycling1 = new Running([39, -12], 27, 95, 523);
// console.log(run1, cycling1);
class App {
  #map;
  #mapEvent;
  #workouts = [];
  #markers = [];
  constructor() {
    this._getPosition();
    this._getLocalStorage();
    // console.log(form);
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField.bind(this));
    containerWorkouts.addEventListener('click', this._moveToMarker.bind(this));
    btnDeleteAll.addEventListener('click', this._deleteAll.bind(this));
  }
  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('could not get your position!');
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    }
  }
  _loadMap(position) {
    // console.log(position);
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, 13);
    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);
    this.#map.on('click', this._showForm.bind(this));
    this.#workouts.forEach(workout => {
      this._renderWorkout(workout);
      this._renderWorkoutMarker(workout);
    });
  }
  _showForm(e) {
    form.classList.remove('hidden');
    inputType.focus();
    this.#mapEvent = e;
  }
  _toggleElevationField(e) {
    console.log(e);
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
  }
  _newWorkout(e) {
    e.preventDefault();
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositives = (...inputs) => inputs.every(inp => inp > 0);
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    // console.log(type, distance, duration);
    let workout;
    if (type === 'running') {
      const cadence = +inputCadence.value;
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositives(distance, duration, cadence)
      ) {
        return alert('Inputs have to be postive numbers!');
      }
      workout = new Running([lat, lng], distance, duration, cadence);
    }

    if (type === 'cycling') {
      const elevationGain = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevationGain) ||
        !allPositives(distance, duration)
      ) {
        return alert('Inputs have to be postive numbers!');
      }
      workout = new Cycling([lat, lng], distance, duration, elevationGain);
    }
    this.#workouts.push(workout);
    this._renderWorkoutMarker(workout);
    this._renderWorkout(workout);
    this._setLocalStorage();
    // console.log(workout);
    inputCadence.value =
      inputDistance.value =
      inputDuration.value =
      inputElevation.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }
  _renderWorkoutMarker(workout) {
    this.#markers.push(
      L.marker(workout.coords)
        .addTo(this.#map)
        .bindPopup(
          L.popup({
            maxWidth: 250,
            minWidth: 100,
            autoClose: false,
            closeOnClick: false,
            className: `${workout.type}-popup ${workout.id}`,
          })
        )
        .setPopupContent(
          `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♂️'} ${workout.description}`
        )
        .openPopup()
    );
  }
  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
      <div class="workout__head">
      <h2 class="workout__title">${workout.description}</h2>
            <div class="workout__menu">
        <details class="workout__menu-dropdown">
          <summary class="workout__menu-btn" aria-label="Options">☰</summary>
          <ul class="workout__menu-list" data-id="${workout.id}">
            <li class="workout__menu-item" data-action="edit">Edit</li>
            <li class="workout__menu-item" data-action="delete">Delete</li>
          </ul>
        </details>
        </div></div>
      <div class="workout__details">
        <span class="workout__icon">${
          workout.type === 'running' ? '🏃‍♂️' : '🚴‍♂️'
        }</span>
        <span class="workout__value">${workout.distance}</span>
        <span class="workout__unit">km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⏱️</span>
        <span class="workout__value">${workout.duration}</span>
        <span class="workout__unit">min</span>
      </div>
      `;
    if (workout.type === 'running') {
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡</span>
          <span class="workout__value">${workout.pace.toFixed(2)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
      `;
    } else {
      html += `
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.speed.toFixed(2)}</span>
        <span class="workout__unit">km/h</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">🏔️</span>
        <span class="workout__value">${workout.elevationGain}</span>
        <span class="workout__unit">m</span>
      </div>
      `;
    }
    html += `</li>`;
    btnDeleteAll.classList.remove('hidden');
    // console.log(btnDeleteAll);
    form.insertAdjacentHTML('afterend', html);
    const btnMenu = document.querySelectorAll('.workout__menu-item');
    btnMenu[0].addEventListener('click', this._editWorkout.bind(this));
    btnMenu[1].addEventListener('click', this._deleteWorkout.bind(this));
  }
  #delete(workoutIndex, targetID, count = 1) {
    const [lat, lng] = this.#workouts[workoutIndex].coords;
    this.#workouts.splice(workoutIndex, count);
    Array.from(document.querySelectorAll('.workout')).find(
      workout => workout.dataset.id === targetID
    ).style.display = 'none';
    if (this.#workouts.length === 0) {
      btnDeleteAll.classList.add('hidden');
    }
    this.#markers
      .find(marker => marker._latlng.lat === lat && marker._latlng.lng === lng)
      .remove();
    this._setLocalStorage();
  }
  _editWorkout(e) {
    const targetID = e.target?.parentNode.dataset.id;
    console.log(this);
    form.classList.remove('hidden');
    const workoutIndex = this.#workouts.findIndex(
      workout => workout.id === targetID
    );
    const oldWorkout = this.#workouts[workoutIndex];
    if (oldWorkout.type === 'running') {
      inputCadence.value = oldWorkout.cadence;
    } else {
      inputElevation.value = oldWorkout.elevationGain;
    }
    inputDistance.value = oldWorkout.distance;
    inputDuration.value = oldWorkout.duration;
    inputType.value = oldWorkout.type;
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    this.#delete(workoutIndex, targetID);
  }
  _deleteWorkout(e) {
    // console.log(this.#markers);
    const targetID = e.target?.parentNode.dataset.id;
    const workoutIndex = this.#workouts.findIndex(
      workout => workout.id === targetID
    );
    this.#delete(workoutIndex, targetID);
  }
  _deleteAll() {
    document.querySelectorAll('.workout').forEach(el => el.remove());
    this.#markers.forEach(marker => marker.remove());
    this.#markers = [];
    this.#workouts = [];
    btnDeleteAll.classList.add('hidden');
    inputDistance.value = '';
    inputDuration.value = '';
    inputCadence.value = '';
    inputElevation.value = '';
    form.classList.add('hidden');
    this._setLocalStorage();
  }
  _moveToMarker(e) {
    if (
      e.target.dataset.action === 'delete' ||
      e.target.dataset.action === 'edit'
    ) {
      return;
    }
    const click = e.target.closest('.workout');
    if (!click) return;
    const workout = this.#workouts.find(
      workout => workout.id === click.dataset.id
    );
    this.#map = this.#map.setView(workout.coords, 13, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
    // workout.click();
  }
  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    if (!data) return;
    this.#workouts = data;
  }
  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}
const app = new App();
