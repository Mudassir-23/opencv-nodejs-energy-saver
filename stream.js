const socketIOProvider = require('socket.io');
const cv = require('opencv4nodejs');

const fps = 30; //frames per second
/**
 * video source set to 0 for stream from webcam
 * video source can be set url from ip cam also eg: "http://192.168.1.112:8080/video"
 */
const videoSource = 0;
const videoCap = new cv.VideoCapture(videoSource);
videoCap.set(cv.CAP_PROP_FRAME_WIDTH, 600);
videoCap.set(cv.CAP_PROP_FRAME_HEIGHT, 600);

const stream = (server) => {
    const io = socketIOProvider(server);
    let processingIntervalMultiple = 10;
    setInterval(() => {
        const frame = videoCap.read();
        const image = cv.imencode('.jpg', frame).toString('base64');
        io.emit('new-frame', { live: image });
    }, 1000 / fps);
    /**
     * Since video/image transformations are computionally expensive operations, these operations are performed independent of live feed streaming.
     */
    setInterval(() => {
        const frame = videoCap.read();
        const faces = detectFaces(frame);
        const imageWithFaces = cv.imencode('.jpg', frame).toString('base64');
        io.emit('new-frame', { transformed: imageWithFaces, transformationData: calculatePeoplePosition(frame, faces) });
    }, 10000 / fps);
};

/**
 * 
 * Face detection transformation on the stream
 */
const detectFaces = (frame) => {
    let faces = [];
    const image = frame.bgrToGray();
    const classifier = new cv.CascadeClassifier(cv.HAAR_FRONTALFACE_ALT2);
    const results = classifier.detectMultiScale(image);
    if (results.objects.length) {
        results.objects.forEach((faceRect, i) => {
            if (results.numDetections[i] < 1) {
                return;
            }
            drawFaces(frame, faceRect);
            faces.push(faceRect);
        });
    }
    return faces;
};
/**
 * Drawing rects around faces on frame
 */
const drawFaces = (frame, faceRect) => {
    const rect = cv.drawDetection(frame, faceRect, {
        color: new cv.Vec(255, 0, 0),
        segmentFraction: 4
    });
};

function calculatePeoplePosition(frame, faces) {
    let display = [0, 0, 0, 0];
    const image = frame.bgrToGray();
    const height = image.sizes[0];
    const width = image.sizes[1];
    faces.forEach((rectSize) => {
        const x = rectSize.x;
        const y = rectSize.y;
        if (x <= width / 2) {
            if (y <= height / 2) {
                display[0]++;
            } else {
                display[3]++;
            }
        } else {
            if (y <= height / 2) {
                display[1]++;
            } else {
                display[2]++;
            }
        }
    })
    return display;
}


module.exports = stream;