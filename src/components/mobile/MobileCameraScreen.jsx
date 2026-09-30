import React from 'react';
import { CameraScanner } from './CameraScanner';

export const MobileCameraScreen = ({ onCapture, isProcessing }) => {
  return <CameraScanner onCapture={onCapture} isProcessing={isProcessing} />;
};

export default MobileCameraScreen;
