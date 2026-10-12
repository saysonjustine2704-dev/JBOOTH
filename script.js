
const camera = document.getElementById("camera");
const cameraMessage = document.getElementById("camera-message");
const countdown = document.getElementById("camera-countdown");
const startButton = document.getElementById("start-camera");
const takeButton = document.getElementById("take-photo");
const statusText = document.getElementById("status");
const photoCount = document.getElementById("photo-count");
const photoStrip = document.getElementById("photo-strip");
const stripColor = document.getElementById("strip-color");
const downloadButton = document.getElementById("download-photo");

const slots = Array.from(
    photoStrip.querySelectorAll(".photo-slot")
);

let cameraStream = null;
let photos = [null, null, null, null];
let nextPhotoIndex = 0;
let retakeIndex = null;
let isCountingDown = false;


// ---------------------------------
// INITIAL SETUP
// ---------------------------------

takeButton.disabled = true;
downloadButton.disabled = true;

addRetakeButtons();
updatePhotoCount();
photoStrip.style.backgroundColor = stripColor.value;


// ---------------------------------
// CAMERA
// ---------------------------------

async function startCamera() {
    try {
        if (!navigator.mediaDevices?.getUserMedia) {
            throw new Error("Camera access is not supported.");
        }

        stopCamera();

        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: "user"
            },
            audio: false
        });

        camera.srcObject = cameraStream;
        await camera.play();

        cameraMessage.style.display = "none";
        startButton.disabled = true;
        takeButton.disabled = false;

        if (retakeIndex !== null) {
            statusText.textContent =
                `Ready to retake Photo ${retakeIndex + 1}.`;
        } else {
            statusText.textContent =
                `Camera ready. Take Photo ${nextPhotoIndex + 1} of 4.`;
        }
    } catch (error) {
        console.error("Camera error:", error);

        statusText.textContent =
            "Unable to open the camera. Allow camera access and try again.";

        startButton.disabled = false;
        takeButton.disabled = true;
    }
}

function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }

    camera.srcObject = null;
}


// ---------------------------------
// COUNTDOWN
// ---------------------------------

function runCountdown() {
    return new Promise(resolve => {
        let number = 3;

        countdown.textContent = number;
        countdown.classList.add("active");

        const timer = setInterval(() => {
            number--;

            if (number > 0) {
                countdown.textContent = number;
            } else {
                clearInterval(timer);
                countdown.textContent = "📸";

                setTimeout(() => {
                    countdown.classList.remove("active");
                    resolve();
                }, 350);
            }
        }, 1000);
    });
}


// ---------------------------------
// TAKE OR RETAKE PHOTO
// ---------------------------------

async function capturePhoto() {
    if (isCountingDown || !cameraStream) return;

    const isRetake = retakeIndex !== null;
    const targetIndex = isRetake ? retakeIndex : nextPhotoIndex;

    if (targetIndex < 0 || targetIndex >= 4) return;

    isCountingDown = true;
    takeButton.disabled = true;
    startButton.disabled = true;

    statusText.textContent = isRetake
        ? `Get ready to retake Photo ${targetIndex + 1}...`
        : `Get ready for Photo ${targetIndex + 1}...`;

    try {
        await runCountdown();

        if (!camera.videoWidth || !camera.videoHeight) {
            throw new Error("Camera is not ready.");
        }

        const canvas = document.createElement("canvas");
        canvas.width = camera.videoWidth;
        canvas.height = camera.videoHeight;

        const context = canvas.getContext("2d");

        // Save a mirrored photo to match the camera preview.
        context.translate(canvas.width, 0);
        context.scale(-1, 1);
        context.drawImage(
            camera,
            0,
            0,
            canvas.width,
            canvas.height
        );

        photos[targetIndex] = canvas.toDataURL("image/jpeg", 0.95);

        // Only advance when taking a new photo.
        if (!isRetake) {
            nextPhotoIndex++;
        }

        retakeIndex = null;

        renderPhotoStrip();
        updatePhotoCount();
        showFlash();

        if (photos.every(photo => photo !== null)) {
            stopCamera();

            cameraMessage.textContent =
                "Your photo strip is ready! You can retake any photo below.";
            cameraMessage.style.display = "flex";

            statusText.textContent =
                "Photo strip complete! Retake any photo or download your strip.";

            startButton.disabled = false;
            takeButton.disabled = true;
            downloadButton.disabled = false;
        } else {
            takeButton.disabled = false;

            statusText.textContent =
                `Photo ${targetIndex + 1} saved! Ready for Photo ${nextPhotoIndex + 1} of 4.`;
        }
    } catch (error) {
        console.error("Capture error:", error);

        statusText.textContent =
            "Could not capture the photo. Please try again.";

        takeButton.disabled = !cameraStream;
    } finally {
        isCountingDown = false;
        startButton.disabled = !photos.every(photo => photo !== null)
            ? false
            : false;
    }
}


// ---------------------------------
// RETAKE BUTTONS
// ---------------------------------

function addRetakeButtons() {
    slots.forEach((slot, index) => {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "retake-slot-button";
        button.textContent = "↻ Retake";
        button.setAttribute(
            "aria-label",
            `Retake Photo ${index + 1}`
        );
        button.hidden = true;

        button.addEventListener("click", async () => {
            if (isCountingDown || !photos[index]) return;

            retakeIndex = index;

            statusText.textContent =
                `Opening camera to retake Photo ${index + 1}...`;

            await startCamera();
        });

        slot.appendChild(button);
    });
}


// ---------------------------------
// UPDATE PHOTO STRIP PREVIEW
// ---------------------------------

function renderPhotoStrip() {
    slots.forEach((slot, index) => {
        let image = slot.querySelector("img");
        const placeholder = slot.querySelector(".placeholder");
        const retakeButton = slot.querySelector(".retake-slot-button");

        if (photos[index]) {
            if (!image) {
                image = document.createElement("img");
                image.alt = `Photo ${index + 1}`;
                slot.prepend(image);
            }

            image.src = photos[index];
            image.style.display = "block";

            if (placeholder) {
                placeholder.hidden = true;
            }

            retakeButton.hidden = false;
        } else {
            if (image) {
                image.remove();
            }

            if (placeholder) {
                placeholder.hidden = false;
            }

            retakeButton.hidden = true;
        }
    });
}

function updatePhotoCount() {
    const completed = photos.filter(Boolean).length;

    photoCount.textContent = completed;
    downloadButton.disabled = completed !== 4;
}


// ---------------------------------
// CAMERA FLASH
// ---------------------------------

function showFlash() {
    const cameraArea = document.querySelector(".camera-area");

    if (!cameraArea) return;

    cameraArea.classList.remove("flash");

    // Restart the flash animation.
    void cameraArea.offsetWidth;

    cameraArea.classList.add("flash");

    setTimeout(() => {
        cameraArea.classList.remove("flash");
    }, 300);
}


// ---------------------------------
// STRIP COLOR
// ---------------------------------

stripColor.addEventListener("change", () => {
    photoStrip.style.backgroundColor = stripColor.value;
});


// ---------------------------------
// DOWNLOAD THE ACTUAL PREVIEW
// ---------------------------------

downloadButton.addEventListener("click", async () => {
    if (!photos.every(Boolean)) {
        statusText.textContent =
            "Please complete all four photos first.";
        return;
    }

    if (typeof html2canvas !== "function") {
        statusText.textContent =
            "The download library did not load. Refresh the page and try again.";
        return;
    }

    downloadButton.disabled = true;
    statusText.textContent = "Preparing your photo strip...";

    try {
        // Wait for fonts so the captured layout matches the preview.
        if (document.fonts?.ready) {
            await document.fonts.ready;
        }

        const canvas = await html2canvas(photoStrip, {
            scale: 3,
            backgroundColor: null,
            logging: false,

            // Hide Retake buttons only in the exported copy.
            onclone: clonedDocument => {
                clonedDocument
                    .querySelectorAll(".retake-slot-button")
                    .forEach(button => {
                        button.style.display = "none";
                    });
            }
        });

        canvas.toBlob(blob => {
            if (!blob) {
                statusText.textContent =
                    "Could not create the JPG. Please try again.";
                downloadButton.disabled = false;
                return;
            }

            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");

            link.download = "JBOOTH-photo-strip.jpg";
            link.href = url;
            link.click();

            setTimeout(() => URL.revokeObjectURL(url), 1000);

            statusText.textContent =
                "Your photo strip has been downloaded!";
            downloadButton.disabled = false;
        }, "image/jpeg", 0.98);
    } catch (error) {
        console.error("Download error:", error);

        statusText.textContent =
            "Download failed. Refresh the page and try again.";

        downloadButton.disabled = false;
    }
});


// ---------------------------------
// START / RESET SESSION
// ---------------------------------

startButton.addEventListener("click", async () => {
    if (isCountingDown) return;

    // Starting again after finishing creates a fresh strip.
    if (photos.every(Boolean)) {
        photos = [null, null, null, null];
        nextPhotoIndex = 0;
        retakeIndex = null;

        renderPhotoStrip();
        updatePhotoCount();

        cameraMessage.textContent =
            "Your camera preview will appear here ♡";
        cameraMessage.style.display = "flex";
    }

    await startCamera();
});

takeButton.addEventListener("click", capturePhoto);
