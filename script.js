
/* =====================================
   GET HTML ELEMENTS
===================================== */

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

/* =====================================
   VARIABLES
===================================== */

let stream = null;
let photos = [];
let busy = false;

/* =====================================
   START CAMERA
===================================== */

startCameraBtn.addEventListener("click", async () => {
    statusText.textContent = "Opening camera...";

    try {
        if (!navigator.mediaDevices ||
            !navigator.mediaDevices.getUserMedia) {
            throw new Error(
                "Camera access is unavailable. Please use HTTPS or Live Server."
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
        cameraMessage.classList.remove("session-complete");

        startCameraBtn.disabled = true;
        takePhotoBtn.disabled = false;

        statusText.textContent =
            "Camera ready! Let's take photos ♡";

    } catch (error) {
        console.error("Camera error:", error);

        statusText.textContent =
            `${error.name}: ${error.message}`;

        cameraMessage.style.display = "flex";
        cameraMessage.textContent =
            "Camera unavailable. Check your browser permission ♡";

        startCameraBtn.disabled = false;
    }
});

/* =====================================
   TAKE PHOTO
===================================== */

takePhotoBtn.addEventListener("click", async () => {
    if (!stream || busy || photos.length >= 4) {
        return;
    }

    busy = true;
    takePhotoBtn.disabled = true;

    for (let seconds = 3; seconds >= 1; seconds--) {
        statusText.textContent = `Get ready! ${seconds}...`;

        await new Promise(resolve =>
            setTimeout(resolve, 1000)
        );
    }

    if (!camera.videoWidth || !camera.videoHeight) {
        statusText.textContent =
            "Camera is not ready. Try again.";

        busy = false;
        takePhotoBtn.disabled = false;
        return;
    }

    /*
       Capture the camera's actual frame dimensions.
       This supports portrait and landscape camera frames.
    */

    const canvas = document.createElement("canvas");
    canvas.width = camera.videoWidth;
    canvas.height = camera.videoHeight;

    const context = canvas.getContext("2d");

    // Mirror the selfie image.
    context.translate(canvas.width, 0);
    context.scale(-1, 1);

    context.drawImage(
        camera,
        0,
        0,
        canvas.width,
        canvas.height
    );

    // Camera flash effect.
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

    if (photos.length < 4) {
        statusText.textContent =
            `Photo ${photos.length} saved! Take the next one ♡`;

        busy = false;
        takePhotoBtn.disabled = false;

    } else {
        statusText.textContent =
            "All four photos are ready! Choose a color and download ♡";

        takePhotoBtn.disabled = true;
        stopCamera();

        startCameraBtn.textContent = "Session Complete";
        busy = false;
    }
});

/* =====================================
   DISPLAY PHOTOS IN PREVIEW
===================================== */

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

    downloadBtn.disabled = photos.length !== 4;
}

/* =====================================
   CHANGE STRIP COLOR
===================================== */

colorPicker.addEventListener("change", () => {
    photoStrip.style.backgroundColor = colorPicker.value;
});

/* =====================================
   DOWNLOAD PHOTO STRIP
===================================== */

downloadBtn.addEventListener("click", () => {
    if (photos.length !== 4) {
        statusText.textContent =
            "Please take all four photos first ♡";
        return;
    }

    /*
       Portrait photobooth strip.
       The 600 x 1800 canvas keeps the same
       1:3 ratio on desktop and mobile.
    */

    const width = 600;
    const height = 1800;

    const padding = 25;
    const gap = 12;

    const photoWidth = width - padding * 2;
    const photoHeight = 350;

    // Four frames and three gaps, plus the top padding.
    const footerY =
        padding + photoHeight * 4 + gap * 3;

    const footerHeight = height - footerY;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");

    // Fill the entire strip with the selected color.
    context.fillStyle = colorPicker.value;
    context.fillRect(0, 0, width, height);

    let loaded = 0;
    let failed = false;

    const images = photos.map(src => {
        const image = new Image();

        image.onload = () => {
            loaded++;

            if (loaded === 4 && !failed) {
                drawStrip();
            }
        };

        image.onerror = () => {
            failed = true;
            statusText.textContent =
                "Unable to load a photo. Please try again.";
        };

        image.src = src;

        return image;
    });

    function drawStrip() {
        images.forEach((image, index) => {
            const x = padding;
            const y = padding + index * (photoHeight + gap);

            // White photo frame.
            context.fillStyle = "#ffffff";
            context.fillRect(
                x,
                y,
                photoWidth,
                photoHeight
            );

            /*
               Center-crop each photo to fill the frame.
               Works for both portrait and landscape images.
            */

            const scale = Math.max(
                photoWidth / image.width,
                photoHeight / image.height
            );

            const cropWidth = photoWidth / scale;
            const cropHeight = photoHeight / scale;

            const cropX = (image.width - cropWidth) / 2;
            const cropY = (image.height - cropHeight) / 2;

            context.save();

            context.beginPath();
            context.rect(
                x,
                y,
                photoWidth,
                photoHeight
            );
            context.clip();

            context.drawImage(
                image,
                cropX,
                cropY,
                cropWidth,
                cropHeight,
                x,
                y,
                photoWidth,
                photoHeight
            );

            context.restore();
        });

        /*
           Footer stays the same color as the selected strip.
           The background was already filled, but redraw it
           explicitly to ensure the footer color matches.
        */

        context.fillStyle = colorPicker.value;
        context.fillRect(
            0,
            footerY,
            width,
            footerHeight
        );

        // Download the finished strip.
        const link = document.createElement("a");

        link.download = "JBOOTH-photo-strip.jpg";
        link.href = canvas.toDataURL("image/jpeg", 0.95);

        link.click();

        statusText.textContent =
            "Your JPG has been downloaded! ♡";
    }
});

/* =====================================
   STOP CAMERA
===================================== */

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
