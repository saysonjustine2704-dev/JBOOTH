// ===== GET HTML ELEMENTS =====
const camera = document.getElementById("camera");
const cameraMessage = document.getElementById("camera-message");
const startCameraBtn = document.getElementById("start-camera");
const takePhotoBtn = document.getElementById("take-photo");
const statusText = document.getElementById("status");
const photoCountText = document.getElementById("photo-count");
const photoStrip = document.getElementById("photo-strip");
const colorPicker = document.getElementById("strip-color");
const downloadBtn = document.getElementById("download-photo");
const photoSlots = document.querySelectorAll(".photo-slot");

// ===== VARIABLES =====
let stream = null;
let photos = [];
let busy = false;

// ===== START CAMERA =====
startCameraBtn.addEventListener("click", async () => {
    statusText.textContent = "Opening camera...";

    try {
        if (!navigator.mediaDevices ||
            !navigator.mediaDevices.getUserMedia) {
            throw new Error(
                "Camera access is unavailable. Open this website using Live Server."
            );
        }

        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: "user"
            },
            audio: false
        });

        camera.srcObject = stream;
        await camera.play();

        cameraMessage.style.display = "none";
        startCameraBtn.disabled = true;
        takePhotoBtn.disabled = false;

        statusText.textContent = "Camera ready! Let's take photos ♡";

    } catch (error) {
        console.error("Camera error:", error);

        statusText.textContent =
            error.name + ": " + error.message;

        cameraMessage.style.display = "flex";
        cameraMessage.textContent =
            "Camera unavailable. Check your browser permission ♡";

        startCameraBtn.disabled = false;
    }
});

// ===== TAKE PHOTO =====
takePhotoBtn.addEventListener("click", async () => {
    if (!stream || busy || photos.length >= 3) {
        return;
    }

    busy = true;
    takePhotoBtn.disabled = true;

    for (let seconds = 3; seconds >= 1; seconds--) {
        statusText.textContent = `Get ready! ${seconds}...`;
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Make sure the camera has produced a video frame.
    if (!camera.videoWidth || !camera.videoHeight) {
        statusText.textContent = "Camera is not ready. Try again.";
        busy = false;
        takePhotoBtn.disabled = false;
        return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = camera.videoWidth;
    canvas.height = camera.videoHeight;

    const context = canvas.getContext("2d");

    // Mirror the selfie.
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(camera, 0, 0, canvas.width, canvas.height);
    const cameraArea = camera.parentElement;
    cameraArea.classList.remove("flash");
    void cameraArea.offsetWidth;
    cameraArea.classList.add("flash");

setTimeout(() => {
    cameraArea.classList.remove("flash");
}, 400);

    photos.push(canvas.toDataURL("image/jpeg", 0.95));

    updatePhotoStrip();
    photoCountText.textContent = photos.length;

    if (photos.length < 3) {
        statusText.textContent =
            `Photo ${photos.length} saved! Take the next one ♡`;
        busy = false;
        takePhotoBtn.disabled = false;
    } else {
        statusText.textContent =
            "All three photos are ready! Choose a color and download ♡";

        stopCamera();
        startCameraBtn.disabled = true;
        startCameraBtn.textContent = "Session Complete";
        busy = false;
    }
});

// ===== DISPLAY PHOTOS =====
function updatePhotoStrip() {
    photoSlots.forEach((slot, index) => {
        slot.innerHTML = "";

        if (photos[index]) {
            const img = document.createElement("img");
            img.src = photos[index];
            img.alt = `Photo ${index + 1}`;
            slot.appendChild(img);
        } else {
            slot.textContent = `PHOTO ${index + 1}`;
        }
    });

    downloadBtn.disabled = photos.length !== 3;
}

// ===== CHANGE STRIP COLOR =====
colorPicker.addEventListener("change", () => {
    photoStrip.style.backgroundColor = colorPicker.value;

    const caption = photoStrip.querySelector(".strip-caption");

    if (caption) {
        caption.style.color =
            colorPicker.value === "#222222" ? "#ffffff" : "#684957";
    }
});

// ===== DOWNLOAD PHOTO STRIP =====
downloadBtn.addEventListener("click", () => {
    if (photos.length !== 3) {
        statusText.textContent = "Please take all three photos first ♡";
        return;
    }

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    const width = 600;
    const padding = 30;
    const gap = 20;
    const photoWidth = width - padding * 2;
    const photoHeight = 400;
    const captionHeight = 70;

    canvas.width = width;
    canvas.height =
        padding * 2 + photoHeight * 3 + gap * 2 + captionHeight;

    context.fillStyle = colorPicker.value;
    context.fillRect(0, 0, canvas.width, canvas.height);

    let loaded = 0;
    const images = photos.map(src => {
        const image = new Image();

        image.onload = () => {
            loaded++;

            if (loaded === 3) {
                drawStrip();
            }
        };

        image.onerror = () => {
            statusText.textContent = "Unable to load a photo. Try again.";
        };

        image.src = src;
        return image;
    });

    function drawStrip() {
        images.forEach((image, index) => {
            const y = padding + index * (photoHeight + gap);

            // Crop the image to fit the photo frame.
            const scale = Math.max(
                photoWidth / image.width,
                photoHeight / image.height
            );

            const sourceWidth = photoWidth / scale;
            const sourceHeight = photoHeight / scale;
            const sourceX = (image.width - sourceWidth) / 2;
            const sourceY = (image.height - sourceHeight) / 2;

            context.drawImage(
                image,
                sourceX, sourceY,
                sourceWidth, sourceHeight,
                padding, y,
                photoWidth, photoHeight
            );
        });

        context.fillStyle =
            colorPicker.value === "#222222" ? "#ffffff" : "#684957";

        context.font = "bold 26px Arial";
        context.textAlign = "center";
        

        const link = document.createElement("a");
        link.download = "my-photobooth-strip.jpg";
        link.href = canvas.toDataURL("image/jpeg", 0.95);
        link.click();

        statusText.textContent = "Your JPG has been downloaded! ♡";
    }
});

// ===== STOP CAMERA =====

function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }

    camera.srcObject = null;

    cameraMessage.textContent =
        "Scroll down to edit your strip and download ♡";

    cameraMessage.style.display = "flex";
    cameraMessage.classList.add("session-complete");
}