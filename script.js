
const camera = document.getElementById("camera");
const cameraMessage = document.getElementById("camera-message");
const countdownDisplay = document.getElementById("camera-countdown");

const startCameraButton = document.getElementById("start-camera");
const takePhotoButton = document.getElementById("take-photo");
const downloadButton = document.getElementById("download-photo");

const statusText = document.getElementById("status");
const photoCountText = document.getElementById("photo-count");
const photoStrip = document.getElementById("photo-strip");
const stripColor = document.getElementById("strip-color");

let stream = null;
let photos = [];
const TOTAL_PHOTOS = 4;

// Start the camera
startCameraButton.addEventListener("click", async () => {
    try {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }

        statusText.textContent = "Starting camera...";

        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: "user"
            },
            audio: false
        });

        camera.srcObject = stream;
        await camera.play();

        cameraMessage.style.display = "none";
        camera.style.display = "block";

        photos = [];
        photoCountText.textContent = "0";
        takePhotoButton.disabled = false;
        downloadButton.disabled = true;

        resetPhotoSlots();

        statusText.textContent = "Camera ready! Take your first photo ♡";
        startCameraButton.textContent = "Restart Session ♡";

    } catch (error) {
        console.error("Camera error:", error);
        statusText.textContent =
            "Unable to open camera. Please allow camera permission and try again.";
    }
});

// Reset the four photo slots
function resetPhotoSlots() {
    const slots = photoStrip.querySelectorAll(".photo-slot");

    slots.forEach((slot, index) => {
        slot.innerHTML = `PHOTO ${index + 1}`;
        slot.style.backgroundImage = "";
    });

    const caption = photoStrip.querySelector(".strip-caption");
    if (caption) {
        caption.textContent = "";
    }
}

// Countdown helper
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runCountdown() {
    for (let number = 3; number >= 1; number--) {
        countdownDisplay.textContent = number;
        await wait(1000);
    }

    countdownDisplay.textContent = "📸";
    await wait(300);

    countdownDisplay.textContent = "";
}

// Capture one photo
async function capturePhoto() {
    if (!camera.videoWidth || !camera.videoHeight) {
        throw new Error("Camera is not ready.");
    }

    const videoWidth = camera.videoWidth;
    const videoHeight = camera.videoHeight;

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    /*
     * Use the camera stream's real dimensions.
     * This avoids forcing portrait or landscape dimensions.
     */
    canvas.width = videoWidth;
    canvas.height = videoHeight;

    // Mirror the selfie, like a front-facing camera preview.
    context.translate(canvas.width, 0);
    context.scale(-1, 1);

    context.drawImage(
        camera,
        0,
        0,
        videoWidth,
        videoHeight
    );

    return canvas.toDataURL("image/jpeg", 0.95);
}

// Take Photo button
takePhotoButton.addEventListener("click", async () => {
    if (!stream || photos.length >= TOTAL_PHOTOS) {
        return;
    }

    takePhotoButton.disabled = true;

    try {
        const photoNumber = photos.length + 1;

        statusText.textContent =
            `Get ready for photo ${photoNumber} of ${TOTAL_PHOTOS} ♡`;

        await runCountdown();

        const photoData = await capturePhoto();
        photos.push(photoData);

        updatePhotoStrip();

        photoCountText.textContent = photos.length;

        // Flash effect
        document.body.classList.add("camera-flash");
        await wait(150);
        document.body.classList.remove("camera-flash");

        if (photos.length < TOTAL_PHOTOS) {
            statusText.textContent =
                `Photo ${photos.length} saved! Get ready for the next one ♡`;

            takePhotoButton.disabled = false;
        } else {
            statusText.textContent =
                "All 4 photos taken! Download your photo strip ♡";

            downloadButton.disabled = false;

            // Stop the camera when the session is complete.
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
                stream = null;
                camera.srcObject = null;
            }

            camera.style.display = "none";
            cameraMessage.style.display = "block";
            cameraMessage.textContent = "Photo session complete! ♡";

            startCameraButton.textContent = "Start New Session ♡";
        }
    } catch (error) {
        console.error("Photo capture error:", error);
        statusText.textContent =
            "Could not capture photo. Please try again.";

        takePhotoButton.disabled = false;
    }
});

// Display the captured photos
function updatePhotoStrip() {
    const slots = photoStrip.querySelectorAll(".photo-slot");

    photos.forEach((photo, index) => {
        const slot = slots[index];

        if (!slot) return;

        slot.innerHTML = "";

        const image = document.createElement("img");
        image.src = photo;
        image.alt = `Photo ${index + 1}`;

        image.style.display = "block";
        image.style.width = "100%";
        image.style.height = "100%";
        image.style.objectFit = "cover";
        image.style.objectPosition = "center";

        slot.appendChild(image);
    });
}

// Change strip background color
stripColor.addEventListener("change", () => {
    photoStrip.style.backgroundColor = stripColor.value;
});

// Download the completed photo strip
downloadButton.addEventListener("click", async () => {
    if (photos.length !== TOTAL_PHOTOS) {
        statusText.textContent = "Please take all 4 photos first ♡";
        return;
    }

    downloadButton.disabled = true;
    statusText.textContent = "Preparing your photo strip... ♡";

    try {
        const outputCanvas = document.createElement("canvas");
        const context = outputCanvas.getContext("2d");

        const stripWidth = 600;
        const padding = 25;
        const gap = 12;
        const photoHeight = 350;

        outputCanvas.width = stripWidth;
        outputCanvas.height =
            padding * 2 +
            photoHeight * TOTAL_PHOTOS +
            gap * (TOTAL_PHOTOS - 1) +
            80;

        // Strip background
        context.fillStyle = stripColor.value;
        context.fillRect(
            0,
            0,
            outputCanvas.width,
            outputCanvas.height
        );

        for (let index = 0; index < photos.length; index++) {
            const image = await loadImage(photos[index]);

            const x = padding;
            const y = padding + index * (photoHeight + gap);
            const frameWidth = stripWidth - padding * 2;

            // White photo border
            context.fillStyle = "#ffffff";
            context.fillRect(
                x - 6,
                y - 6,
                frameWidth + 12,
                photoHeight + 12
            );

            // Crop to fit the frame without stretching.
            drawCover(
                context,
                image,
                x,
                y,
                frameWidth,
                photoHeight
            );
        }

        // Caption
        context.fillStyle = "#ffffff";
        context.font = "bold 26px Arial";
        context.textAlign = "center";
        context.fillText(
            "JBOOTH ♡",
            stripWidth / 2,
            outputCanvas.height - 25
        );

        const link = document.createElement("a");
        link.download = "JBOOTH-photo-strip.jpg";
        link.href = outputCanvas.toDataURL("image/jpeg", 0.95);
        link.click();

        statusText.textContent = "Your photo strip is ready! ♡";
    } catch (error) {
        console.error("Download error:", error);
        statusText.textContent =
            "Could not create the photo strip. Please try again.";
    } finally {
        downloadButton.disabled = false;
    }
});

// Load a photo for the download canvas
function loadImage(source) {
    return new Promise((resolve, reject) => {
        const image = new Image();

        image.onload = () => resolve(image);
        image.onerror = () => reject(
            new Error("Could not load captured photo.")
        );

        image.src = source;
    });
}

// Fill a frame while preserving the image proportions
function drawCover(context, image, x, y, width, height) {
    const imageRatio = image.width / image.height;
    const frameRatio = width / height;

    let sourceX = 0;
    let sourceY = 0;
    let sourceWidth = image.width;
    let sourceHeight = image.height;

    if (imageRatio > frameRatio) {
        sourceWidth = image.height * frameRatio;
        sourceX = (image.width - sourceWidth) / 2;
    } else {
        sourceHeight = image.width / frameRatio;
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

// Apply the selected color immediately
photoStrip.style.backgroundColor = stripColor.value;
