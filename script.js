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
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    this.description = `${this.type[0].toUpperCase() + this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDecription();
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
  }
  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

class App {
  #map;
  #mapEvent;
  #workouts = [];
  #markers = new Map();
  #editingWorkout = null;

  constructor() {
    this._getPosition();
    this._getLocalStorage();
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
    inputDistance.focus();
    this.#mapEvent = e;
  }

  _toggleElevationField(e) {
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

    let coords;
    if (this.#editingWorkout) {
      coords = this.#editingWorkout.coords;
    } else {
      const { lat, lng } = this.#mapEvent.latlng;
      coords = [lat, lng];
    }

    let workout;
    if (type === 'running') {
      const cadence = +inputCadence.value;
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositives(distance, duration, cadence)
      ) {
        return alert('Inputs have to be positive numbers!');
      }
      workout = new Running(coords, distance, duration, cadence);
    }

    if (type === 'cycling') {
      const elevationGain = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevationGain) ||
        !allPositives(distance, duration)
      ) {
        return alert('Inputs have to be positive numbers!');
      }
      workout = new Cycling(coords, distance, duration, elevationGain);
    }

    if (this.#editingWorkout) {
      workout.id = this.#editingWorkout.id;
      workout.date = this.#editingWorkout.date;
      workout._setDecription();
    }

    this.#workouts.push(workout);
    this._renderWorkoutMarker(workout);
    this._renderWorkout(workout);
    this._setLocalStorage();

    this.#editingWorkout = null;

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
    const marker = L.marker(workout.coords)
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
      .openPopup();

    this.#markers.set(workout.id, marker);
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
    form.insertAdjacentHTML('afterend', html);
  }

  #delete(workoutIndex, targetID) {
    this.#workouts.splice(workoutIndex, 1);
    const workoutEl = Array.from(document.querySelectorAll('.workout')).find(
      workout => workout.dataset.id === targetID
    );
    if (workoutEl) {
      workoutEl.remove();
    }
    if (this.#workouts.length === 0) {
      btnDeleteAll.classList.add('hidden');
    }

    const marker = this.#markers.get(targetID);
    if (marker) {
      marker.remove();
      this.#markers.delete(targetID);
    }

    this._setLocalStorage();
  }

  _editWorkout(e) {
    const targetID = e.target?.parentNode.dataset.id;
    form.classList.remove('hidden');
    const workoutIndex = this.#workouts.findIndex(
      workout => workout.id === targetID
    );
    const oldWorkout = this.#workouts[workoutIndex];

    this.#editingWorkout = oldWorkout;

    if (oldWorkout.type === 'running') {
      inputCadence.value = oldWorkout.cadence;
      inputCadence.closest('.form__row').classList.remove('form__row--hidden');
      inputElevation.closest('.form__row').classList.add('form__row--hidden');
      inputElevation.value = '';
    } else {
      inputElevation.value = oldWorkout.elevationGain;
      inputElevation
        .closest('.form__row')
        .classList.remove('form__row--hidden');
      inputCadence.closest('.form__row').classList.add('form__row--hidden');
      inputCadence.value = '';
    }

    inputDistance.value = oldWorkout.distance;
    inputDuration.value = oldWorkout.duration;
    inputType.value = oldWorkout.type;
    this.#delete(workoutIndex, targetID);
  }

  _deleteWorkout(e) {
    const targetID = e.target?.parentNode.dataset.id;
    const workoutIndex = this.#workouts.findIndex(
      workout => workout.id === targetID
    );
    this.#delete(workoutIndex, targetID);
  }

  _deleteAll() {
    document.querySelectorAll('.workout').forEach(el => el.remove());
    this.#markers.forEach(marker => marker.remove());
    this.#markers.clear();
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
    if (e.target.classList.contains('workout__menu-item')) {
      const action = e.target.dataset.action;
      if (action === 'delete') {
        this._deleteWorkout(e);
      } else if (action === 'edit') {
        this._editWorkout(e);
      }
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
