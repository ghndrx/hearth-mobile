module.exports = {
  detectFacesAsync: jest.fn().mockResolvedValue({ faces: [] }),
  FaceDetectorMode: { fast: 1, accurate: 2 },
  FaceDetectorLandmarks: { none: 0, all: 1 },
  FaceDetectorClassifications: { none: 0, all: 1 },
};
