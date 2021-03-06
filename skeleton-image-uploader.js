/* eslint-disable max-len */
/* eslint-disable-next-line max-len */
import {html, PolymerElement} from '@polymer/polymer/polymer-element.js';
import {GestureEventListeners} from '@polymer/polymer/lib/mixins/gesture-event-listeners.js';
import '@polymer/paper-styles/color.js';
import '@polymer/iron-image/iron-image.js';
import '@polymer/iron-ajax/iron-ajax.js';
import './load-image.js';

/**
 * `skeleton-image-uploader`
 *
 *
 * @customElement
 * @polymer
 * @demo demo/index.html
 */
class SkeletonImageUploader extends GestureEventListeners(PolymerElement) {
  /**
   * @return {!HTMLTemplateElement}
   */
  static get template() {
    return html`
    <style>
      :host {
        --progress-overlay-color: var(--paper-grey-800);
        display: block;
        padding-bottom: 40%;
        position: relative;
      }

      #image-container {
        display: block;
        position: absolute;
        left: 0;
        right: 0;
        top: 0;
        bottom: 0;
        z-index: 1;
        overflow: hidden;
      }

      #image-container.dragover {
        border: 1px solid var(--progress-overlay-color);
        transition: all .3s;
      }

      .progress {
        transform: rotate(-90deg);
        position: absolute;
        left: 0;
        right: 0;
        top: 0;
        bottom: 0;
        pointer-events: none;
        z-index: 5;
      }

      #progress-value {
        bottom: 0;
        fill: none;
        left: 0;
        opacity: 1;
        position: absolute;
        stroke-dasharray: 3.1416;
        stroke-linecap: none;
        stroke: var(--progress-overlay-color);
        top: 0;
        transition: all 100ms linear;
        z-index: 10;
      }

      #progress-bar {
        background-color: var(--progress-overlay-color);
        bottom: 0;
        left: 0;
        opacity: 1;
        pointer-events: none;
        position: absolute;
        top: 0;
        transition: all 100ms linear;
        z-index: 10;
      }

      .progress.uploaded-true,
      #progress-bar.uploaded-true {
        opacity: 0;
        transition-duration: 100ms;
      }

      :host([circle]) {
        padding-bottom: 100%;
      }

      :host([circle]) #image-container,
      :host([circle]) iron-image {
        border-radius: 50%;
      }

      iron-image {
        display: block;
        position: relative;
        cursor: pointer;
        z-index: 3;
        height: 100%;
        --iron-image-width: 100%;
        --iron-image-height: auto;
        --iron-image-placeholder: {
          background-color: var(--paper-grey-900);
        };
        /*@apply --image-styles;*/
      }

      paper-fab {
        position: absolute;
        z-index: 3;
        bottom: 0;
        right: 0;
        /*@apply --upload-icon-styles;*/
      }

      input {
        display: none;
      }
    </style>

    <iron-ajax id="vision"
               method="post"
               headers='{"content-type":"application/json","cache-control":"no-cache"}'
               handle-as="json"
               url$="https://vision.googleapis.com/v1/images:annotate?key=[[vision]]"
               on-response="_visionResponse"
               on-error="_visionError"
               debounce-duration="300"
               hidden
               disabled$="[[!vision]]"></iron-ajax>

    <input id="media-capture" 
           type="file" 
           accept="image/*" 
           on-change="_initialize"
           hidden
           capture="[[captureMethod]]">

    <div id="image-container" class="image-container">
      <iron-image src$="{{src}}"
                  sizing="[[sizing]]"
                  position="center"
                  preload
                  fade
                  on-tap="capture"
                  disabled$="{{uploading}}"
                  placeholder$="[[placeholder]]"></iron-image>

      <template is="dom-if" if="{{showCircleProgress}}">
        <svg class$="progress uploaded-[[uploaded]]"
             width="100%"
             height="100%"
             viewBox="0 0 1 1">
          <circle id="progress-value"
                  cx="0.5"
                  cy="0.5"
                  r="0.5"
                  stroke-width$="[[strokeWidth]]"
                  stroke-dashoffset$="[[progressValue]]"></circle>
        </svg>
      </template>

      <template is="dom-if" if="{{showHorizontalProgress}}">
        <div id="progress-bar"
             class$="uploaded-[[uploaded]]"
             style$="width:[[uploadProgress]]%;"></div>
      </template>
    </div>
`;
  }

  /**
   * @return {string}
   */
  static get is() {
    return 'skeleton-image-uploader';
  }

  /**
   * @return {Object}
   */
  static get properties() {
    return {
      path: {
        type: String,
        value: null,
        observer: '_pathChanged',
      },
      imageDataUrl: {
        type: Object,
      },
      imageAnalysing: {
        type: Boolean,
        value: false,
      },
      uploading: {
        type: Boolean,
        value: false,
      },
      uploadProgress: {
        type: Number,
        reflectToAttribute: true,
        value: null,
      },
      uploaded: {
        type: Boolean,
        value: false,
        computed: '_getUploaded(uploadProgress)',
      },
      progressValue: {
        type: Number,
        value: null,
        computed: '_dashOffset(uploadProgress)',
      },
      circle: {
        type: Boolean,
        value: false,
      },
      horizontal: {
        type: Boolean,
        value: false,
      },
      showCircleProgress: {
        type: Boolean,
        value: false,
        computed: '_showCircleProgress(src, circle)',
      },
      showHorizontalProgress: {
        type: Boolean,
        value: false,
        computed: '_showHorizontalProgress(src, horizontal)',
      },
      strokeWidth: {
        type: Number,
        value: 0.05,
      },
      src: {
        type: String,
        value: null,
      },
      imageVisionError: {
        type: Boolean,
        value: false,
      },
      imageSafe: {
        type: Boolean,
        value: true,
        computed: '_validateImages(imageVisionError,imageUnsafeAdult, imageUnsafeSpoof, imageUnsafeMedical, imageUnsafeViolence)',
      },
      imageUnsafeLogos: {
        type: Boolean,
        value: false,
      },
      imageUnsafeAdult: {
        type: Boolean,
        value: false,
      },
      imageUnsafeSpoof: {
        type: Boolean,
        value: false,
      },
      imageUnsafeMedical: {
        type: Boolean,
        value: false,
      },
      imageUnsafeViolence: {
        type: Boolean,
        value: false,
      },
      contentType: {
        type: String,
        value: 'image/jpeg',
      },
      metadata: {
        type: Object,
        value: {
          customMetadata: {},
        },
      },
      disabled: {
        type: Boolean,
        value: false,
      },
      vision: {
        type: String,
        value: null,
      },
      placeholder: {
        type: String,
        value: null,
      },
      captureMethod: {
        type: String,
        value: '',
      },
      exist: {
        type: Boolean,
        value: false,
        reflectToAttribute: true,
      },
      maxWidth: {
        type: Number,
        value: 2500,
      },
      maxHeight: {
        type: Number,
        value: 2500,
      },
      minWidth: {
        type: Number,
        value: 300,
      },
      minHeight: {
        type: Number,
        value: 300,
      },
      sizing: {
        type: String,
        value: 'cover',
      },
      /**
       * Error
       */
      error: {
        type: Object,
        notify: true,
        reflectToAttribute: true,
        value: null,
      },
      checkAdult: {
        type: Boolean,
        value: false,
        notify: true,
        reflectToAttribute: true,
      },
      checkMedical: {
        type: Boolean,
        value: false,
        notify: true,
        reflectToAttribute: true,
      },
      checkSpoof: {
        type: Boolean,
        value: false,
        notify: true,
        reflectToAttribute: true,
      },
      checkViolence: {
        type: Boolean,
        value: false,
        notify: true,
        reflectToAttribute: true,
      },
    };
  }

  /**
   * Ready event
   */
  connectedCallback() {
    super.connectedCallback();
    const dropzone = this.shadowRoot.querySelector('#image-container');

    dropzone.ondrop = (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      this._initialize(e, e.dataTransfer.files[0]);
    };

    dropzone.ondragover = function() {
      return false;
    };

    dropzone.ondragleave = function() {
      return false;
    };
  }

  /**
   * Start taking a picture.
   *
   */
  capture() {
    const input = this.shadowRoot.querySelector('input');
    input.value = null;
    input.click();
  }

  /**
   * Path Changed
   *
   * @param {string} path
   * @private
   */
  _pathChanged(path) {
    if (!path) return;

    this.exists = false;

    const pathRef = firebase.storage().ref().child(path);

    // Get the download URL
    pathRef.getDownloadURL()
      .then(() => this.exists = true)
      .catch(() => this.exists = false);
  }

  /**
   * Remove file from storage
   *
   * @return {*}
   */
  remove() {
    if (!this.exists) {
      return Promise.reject(new Error('File does not exists'));
    }

    const pathRef = firebase.storage().ref().child(this.path);

    // Get the download URL
    return pathRef.delete()
      .then(() => this.src = null)
      .catch((error) => this.error = error);
  }

  /**
   * Initialize the image capture
   *
   * @param {object} event
   * @param {object} fileObject
   * @private
   */
  _initialize(event, fileObject) {
    this._resetImageProperties();
    const image = fileObject
      ? fileObject
      : this.shadowRoot.querySelector('#media-capture').files[0];

    this._imageObject = image;
    this._setImagePreview(image);
  }

  /**
   * Upload a single image
   *
   * @param {string} image
   * @param {string} location
   * @private
   */
  _uploadImage(image, location) {
    let fileExt = /\.[\w]+/.exec(this._imageObject.name);
    // create a storage reference
    const storage = firebase.storage().ref(location + fileExt);
    // Upload the file
    this.uploadTask = storage.put(image, this.metadata);

    this.uploadTask.on('state_changed', (snapshot) => {
      // Observe state change events such as progress, pause, and resume
      const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
      this.uploadProgress = progress;
      switch (snapshot.state) {
        case firebase.storage.TaskState.PAUSED: // or 'paused'
          this._dispatchEvent('paused', 'Upload is paused');
          break;
        case firebase.storage.TaskState.RUNNING: // or 'running'
          this._dispatchEvent('running', 'Upload is running');
          break;
      }
    }, (error) => {
      this._dispatchEvent('error', error);
      // Handle unsuccessful uploads
    }, () => {
      this.uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
        // Handle successful uploads on complete
        let downloadUrl = downloadURL;
        this._dispatchEvent('completed', downloadUrl);
        this._pathChanged();
      });
    });
  }

  /**
   * get uploaded
   *
   * @param {number} uploadProgress
   * @private
   * @return {*}
   */
  _getUploaded(uploadProgress) {
    return uploadProgress === 100;
  }

  /**
   * dash offset
   *
   * @param {number} uploadProgress
   * @private
   * @return {*}
   */
  _dashOffset(uploadProgress) {
    return Math.PI * (1 - (uploadProgress / 100));
  }

  /**
   * show circle progress
   *
   * @param {string} src
   * @param {Boolean} circle
   * @private
   * @return {*}
   */
  _showCircleProgress(src, circle) {
    if (src && circle) {
      return true;
    }
  }

  /**
   * show circle progress
   *
   * @param {string} src
   * @param {Boolean} horizontal
   * @private
   * @return {*}
   */
  _showHorizontalProgress(src, horizontal) {
    if (src && horizontal) {
      return true;
    }
  }

  /**
   * set image preview
   *
   * @private
   */
  _setImagePreview() {
    loadImage(
      this._imageObject,
      (img) => {
        const finalImage = img.toDataURL(this._imageObject.type);
        this.src = finalImage;
        if (!this.vision) return this._createImage();
        this._vision(finalImage);
      }, {
        maxWidth: 1000,
        maxHeight: 1000,
        minWidth: 600,
        minHeight: 600,
        canvas: true,
      }
    );
  }

  /**
   * set image preview
   *
   * @param {string} image
   * @private
   */
  _createImage(image) {
    if (!this._imageObject) return;

    if (this._imageObject.type === 'image/gif') {
      this._uploadImage(this._imageObject, this.path);
    }

    loadImage(
      this._imageObject,
      (data) => {
        const image = this._toBlob(data, this._imageObject.type);
        this._uploadImage(image, this.path);
      }, {
        maxWidth: this.maxWidth,
        maxHeight: this.maxHeight,
        minWidth: this.minWidth,
        minHeight: this.minHeight,
        canvas: true,
        crop: false,
        meta: true,
      }
    );
  }

  /**
   * Blob the image to be able to upload
   *
   * @param {object} canvas
   * @param {string} type
   * @param {number} quality
   * @return {*}
   * @private
   */
  _toBlob(canvas, type, quality = 0.9) {
    const binStr = atob(canvas.toDataURL(type, quality).split(',')[1]);
    const len = binStr.length;
    const arr = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      arr[i] = binStr.charCodeAt(i);
    }
    return new Blob([arr], {
      type: type,
    });
  }

  /**
   * Clear uploader
   *
   * @private
   */
  _clearUpload() {
    this.uploading = false;
    this.uploadProgress = 0;
  }

  /**
   * Reset the image properties
   *
   * @private
   */
  _resetImageProperties() {
    this.imageAnalysing = true;
    this.imageVisionError = false;
    this.imageUnsafeLogos = false;
    this.imageUnsafeAdult = false;
    this.imageUnsafeSpoof = false;
    this.imageUnsafeMedical = false;
    this.imageUnsafeViolence = false;
  }

  /**
   * Call vision to validate and prepare the image
   *
   * @param {string} image
   * @private
   */
  _vision(image) {
    // Reformat image
    const finalImage = image.replace(/^data:image\/[a-z]+;base64,/, '');
    this._visionFormat(finalImage);
  }

  /**
   * Set the json object for the Google Cloud Vision Request
   *
   * @param {string} image
   * @private
   */
  _visionFormat(image) {
    const data = JSON.stringify({
      'requests': [{
        'image': {
          'content': image,
        },
        'features': [{
          'type': 'SAFE_SEARCH_DETECTION',
          'maxResults': 1,
        }],
      }],
    });
    this._sendVisionRequest(data);
  }

  /**
   * Send request to Google Cloud Vision
   *
   * @param {object} bodyData
   * @private
   */
  _sendVisionRequest(bodyData) {
    const vision = this.shadowRoot.querySelector('#vision');
    vision.body = bodyData;
    vision.generateRequest();
  }

  /**
   * Parse the response from Google Cloud Vision
   *
   * @param {object} response
   * @private
   */
  _visionResponse(response) {
    let responses = response.detail.response.responses[0];
    if (responses) {
      const safeSearchAnnotation = responses.safeSearchAnnotation;
      if (safeSearchAnnotation) {
        this._validateSafeImage(safeSearchAnnotation);
      }
    }
    this.imageAnalysing = false;
  }

  /**
   * Validate the image and check if is safe to upload.
   * @param {object} safeSearchAnnotation
   * @private
   */
  _validateSafeImage(safeSearchAnnotation) {
    const topics = [
      {cmd: 'checkAdult', annotation: 'adult', attr: 'imageUnsafeAdult'},
      {cmd: 'checkSpoof', annotation: 'spoof', attr: 'imageUnsafeSpoof'},
      {cmd: 'checkMedical', annotation: 'medical', attr: 'imageUnsafeMedical'},
      {cmd: 'checkViolence', annotation: 'violence', attr: 'imageUnsafeViolence'},
    ];

    let someIsUnsafe = false;

    topics.forEach((topic) => {
      if (
        this[topic.cmd] &&
        this._checkSafe(safeSearchAnnotation[topic.annotation])
      ) {
        this[topic.attr] = true;
        someIsUnsafe = true;
      }
    });

    if (someIsUnsafe) {
      this._dispatchEvent('validation-error', 'Image is unsafe');
      this.error = new Error('Image is unsafe');
    } else {
      this._createImage();
    }
  }

  /**
   * Handle error from Google Cloud Vision
   * @private
   * @param {object} error
   */
  _visionError(error) {
    this._dispatchEvent('vision', error);
    this.imageVisionError = true;
  }

  /**
   * @param {object} Likelihood
   * @return {boolean}
   * @private
   */
  _checkSafe(Likelihood) {
    const unsafeImages = ['UNKNOWN', 'POSSIBLE', 'LIKELY', 'VERY_LIKELY'];
    let i = unsafeImages.length;
    while (i--) {
      if (Likelihood === unsafeImages[i]) {
        return true;
      }
    }
    return false;
  }

  /**
   * Validate the post fields and the images
   *
   * @param {boolean} visionError
   * @param {boolean} adult
   * @param {boolean} spoof
   * @param {boolean} medical
   * @param {boolean} violence
   * @return {boolean}
   * @private
   */
  _validateImages(visionError, adult, spoof, medical, violence) {
    return !visionError && !adult && !spoof && !medical && !violence;
  }

  /**
   * Dispatch event
   *
   * @param {string} event
   * @param  {string} detail
   * @private
   */
  _dispatchEvent(event, detail) {
    this.dispatchEvent(new CustomEvent(event, {
      detail: detail,
      bubbles: true,
      composed: true,
    }));
  }
}

window.customElements.define(SkeletonImageUploader.is, SkeletonImageUploader);
