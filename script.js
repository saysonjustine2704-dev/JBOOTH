
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

const slots = Array.from(document.querySelectorAll(".photo-slot"));

let cameraStream = null;
let photos = [null, null, null, null];
let nextPhotoIndex = 0;
let retakeIndex = null;
let isCountingDown = false;

// Start with the camera and capture button disabled.
takeButton.disabled = true;
downloadButton.disabled = true;
updatePhotoCount();
addRetakeButtons();


// -------------------------------
// CAMERA
// -------------------------------

async function startCamera() {
    try {
        if (cameraStream) {
            stopCamera();
        }

        if (!navigator.mediaDevices?.getUserMedia) {
            throw new Error("Your browser does not support camera access.");
        }

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
            "Unable to open the camera. Please allow camera access and try again.";

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
    takeButton.disabled = true;
    startButton.disabled = false;
}


// -------------------------------
// COUNTDOWN
// -------------------------------

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


// -------------------------------
// TAKE OR RETAKE A PHOTO
// -------------------------------

async function capturePhoto() {
    if (isCountingDown || !cameraStream) {
        return;
    }

    // Remember which slot this capture should replace.
    const targetIndex =
        retakeIndex !== null ? retakeIndex : nextPhotoIndex;

    if (targetIndex >= 4) {
        return;
    }

    isCountingDown = true;
    takeButton.disabled = true;
    startButton.disabled = true;

    statusText.textContent =
        retakeIndex !== null
            ? `Get ready to retake Photo ${targetIndex + 1}...`
            : `Get ready for Photo ${targetIndex + 1}...`;

    await runCountdown();

    if (!camera.videoWidth || !camera.videoHeight) {
        statusText.textContent =
            "Camera is not ready. Please try again.";

        isCountingDown = false;
        takeButton.disabled = false;
        return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = camera.videoWidth;
    canvas.height = camera.videoHeight;

    const context = canvas.getContext("2d");

    // Mirror the saved photo to match the mirrored camera preview.
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(camera, 0, 0, canvas.width, canvas.height);

    // Save the new image in the selected slot.
    photos[targetIndex] = canvas.toDataURL("image/jpeg", 0.95);

    // Advance only when taking a new photo, not when retaking.
    if (retakeIndex === null) {
        nextPhotoIndex++;
    }

    retakeIndex = null;

    renderPhotoStrip();
    updatePhotoCount();
    showFlash();

    isCountingDown = false;

    // If all four photos exist, finish the session.
    if (photos.every(photo => photo !== null)) {
        stopCamera();

        cameraMessage.textContent =
            "Your photo strip is ready! You can retake any photo below.";
        cameraMessage.style.display = "flex";

        statusText.textContent =
            "Photo strip complete! Retake any photo or download your strip.";

        downloadButton.disabled = false;
    } else {
        takeButton.disabled = false;

        statusText.textContent =
            `Photo ${targetIndex + 1} saved! Ready for Photo ${nextPhotoIndex + 1} of 4.`;
    }
}


// -------------------------------
// RETAKE BUTTONS
// -------------------------------

function addRetakeButtons() {
    slots.forEach((slot, index) => {
        // Avoid adding duplicate buttons.
        if (slot.querySelector(".retake-slot-button")) {
            return;
        }

        const button = document.createElement("button");
        button.type = "button";
        button.className = "retake-slot-button";
        button.textContent = "↻ Retake";
        button.setAttribute("aria-label", `Retake Photo ${index + 1}`);
        button.hidden = true;

        button.addEventListener("click", async () => {
            if (isCountingDown) {
                return;
            }

            if (!photos[index]) {
                return;
            }

            retakeIndex = index;

            statusText.textContent =
                `Opening camera to retake Photo ${index + 1}...`;

            await startCamera();
        });

        slot.appendChild(button);
    });
}


// -------------------------------
// UPDATE PHOTO STRIP PREVIEW
// -------------------------------

function renderPhotoStrip() {
    slots.forEach((slot, index) => {
        let image = slot.querySelector("img");
        const retakeButton = slot.querySelector(".retake-slot-button");

        if (photos[index]) {
            if (!image) {
                image = document.createElement("img");
                image.alt = `Photo ${index + 1}`;
                slot.prepend(image);
            }

            image.src = photos[index];
            image.style.display = "block";

            // Show a retake button only after this slot has a photo.
            if (retakeButton) {
                retakeButton.hidden = false;
            }

            // Remove placeholder text without removing the image/button.
            Array.from(slot.childNodes).forEach(node => {
                if (
                    node.nodeType === Node.TEXT_NODE &&
                    node.textContent.trim()
                ) {
                    node.remove();
                }
            });
        } else {
            if (image) {
                image.remove();
            }

            if (retakeButton) {
                retakeButton.hidden = true;
            }

            if (!slot.textContent.trim()) {
                slot.insertBefore(
                    document.createTextNode(`PHOTO ${index + 1}`),
                    retakeButton
                );
            }
        }
    });
}

function updatePhotoCount() {
    const completed = photos.filter(photo => photo !== null).length;
    photoCount.textContent = completed;
    downloadButton.disabled = completed !== 4;
}


// -------------------------------
// CAMERA FLASH EFFECT
// -------------------------------

function showFlash() {
    const cameraArea = document.querySelector(".camera-area");

    if (!cameraArea) {
        return;
    }

    cameraArea.classList.add("flash-effect");

    setTimeout(() => {
        cameraArea.classList.remove("flash-effect");
    }, 180);
}


// -------------------------------
// STRIP COLOR
// -------------------------------

if (stripColor) {
    stripColor.addEventListener("change", () => {
        photoStrip.style.backgroundColor = stripColor.value;
    });

    photoStrip.style.backgroundColor = stripColor.value;
}


// -------------------------------
// DOWNLOAD PHOTO STRIP
// -------------------------------

function drawCover(context, image, x, y, width, height) {
    const imageRatio = image.width / image.height;
    const targetRatio = width / height;

    let sourceX = 0;
    let sourceY = 0;
    let sourceWidth = image.width;
    let sourceHeight = image.height;

    if (imageRatio > targetRatio) {
        sourceWidth = image.height * targetRatio;
        sourceX = (image.width - sourceWidth) / 2;
    } else {
        sourceHeight = image.width / targetRatio;
        sourceY = (image.height - sourceHeight) / 2;
    }

    context.drawImage(
        image,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        x,
        y,
        width,
        height
    );
}

downloadButton.addEventListener("click", async () => {
    if (!photos.every(photo => photo !== null)) {
        statusText.textContent = "Please complete all four photos first.";
        return;
    }

    downloadButton.disabled = true;
    statusText.textContent = "Preparing your photo strip...";

    try {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        // Keep the existing strip proportions.
        const stripWidth = 600;
        const sidePadding = 38;
        const photoWidth = stripWidth - sidePadding * 2;
        const photoHeight = 350;
        const gap = 24;
        const topPadding = 38;
        const bottomPadding = 45;

        canvas.width = stripWidth;
        canvas.height =
            topPadding +
            photoHeight * 4 +
            gap * 3 +
            bottomPadding;

        context.fillStyle = stripColor
            ? stripColor.value
            : "#f6b8d0";

        context.fillRect(0, 0, canvas.width, canvas.height);

        for (let index = 0; index < 4; index++) {
            const image = new Image();

            await new Promise((resolve, reject) => {
                image.onload = resolve;
                image.onerror = reject;
                image.src = photos[index];
            });

            const y = topPadding + index * (photoHeight + gap);

            context.fillStyle = "#ffffff";
            context.fillRect(
                sidePadding - 6,
                y - 6,
                photoWidth + 12,
                photoHeight + 12
            );

            drawCover(
                context,
                image,
                sidePadding,
                y,
                photoWidth,
                photoHeight
            );
        }

        // Optional caption at the bottom of the strip.
        context.fillStyle = "#684957";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.font = "28px cursive";

        const caption = document.querySelector(".strip-caption");
        if (caption && caption.textContent.trim()) {
            context.fillText(
                caption.textContent.trim(),
                canvas.width / 2,
                canvas.height - 23
            );
        }

        const link = document.createElement("a");
        link.download = "JBOOTH-photo-strip.jpg";
        link.href = canvas.toDataURL("image/jpeg", 0.95);
        link.click();

        statusText.textContent = "Your photo strip has been downloaded!";
    } catch (error) {
        console.error("Download error:", error);
        statusText.textContent =
            "Something went wrong while creating your photo strip.";
    } finally {
        downloadButton.disabled = false;
    }
});


// -------------------------------
// BUTTON EVENTS
// -------------------------------

startButton.addEventListener("click", () => {
    // Starting a new session resets the previous photos.
    if (photos.every(photo => photo !== null)) {
        photos = [null, null, null, null];
        nextPhotoIndex = 0;
        retakeIndex = null;

        renderPhotoStrip();
        updatePhotoCount();

        cameraMessage.textContent = "Camera is starting...";
    }

    if (retakeIndex === null) {
        cameraMessage.textContent = "Camera is starting...";
    }

    startCamera();
});

takeButton.addEventListener("click", capturePhoto);
