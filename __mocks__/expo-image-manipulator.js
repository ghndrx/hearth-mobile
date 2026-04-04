module.exports = {
  manipulateAsync: jest.fn().mockResolvedValue({ uri: 'file://mock.jpg', width: 100, height: 100 }),
  SaveFormat: { JPEG: 'jpeg', PNG: 'png' },
  FlipType: { Horizontal: 'horizontal', Vertical: 'vertical' },
};
