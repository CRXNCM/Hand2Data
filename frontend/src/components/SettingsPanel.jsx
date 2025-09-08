import React, { useState } from 'react';
import { 
  Card, 
  CardBody, 
  Typography, 
  Button
} from '@material-tailwind/react';

const SettingsPanel = () => {
  const [open, setOpen] = useState(0);
  const [preprocessingOptions, setPreprocessingOptions] = useState({
    thresholding: false,
    denoise: false,
    deskew: false
  });

  const handleOpen = (value) => {
    setOpen(open === value ? 0 : value);
  };

  const handleCheckboxChange = (option) => {
    setPreprocessingOptions(prev => ({
      ...prev,
      [option]: !prev[option]
    }));
  };

  return (
    <Card className="shadow-sm">
      <CardBody className="p-6">
        <Typography variant="h5" color="blue-gray" className="mb-4">
          Settings
        </Typography>

        <div className="space-y-4">
          <Card className="border border-blue-gray-200">
            <CardBody className="p-4">
              <Button
                variant="text"
                className="w-full justify-start p-0 h-auto text-left"
                onClick={() => handleOpen(1)}
              >
                <Typography variant="h6" color="blue-gray" className="font-medium">
                  OCR Language
                </Typography>
              </Button>
              <div className={`transition-all duration-300 ${open === 1 ? 'max-h-96 opacity-100 mt-4' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                <select className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                  <option value="en">English</option>
                  <option value="fr">French</option>
                  <option value="es">Spanish</option>
                  <option value="de">German</option>
                </select>
              </div>
            </CardBody>
          </Card>

          <Card className="border border-blue-gray-200">
            <CardBody className="p-4">
              <Button
                variant="text"
                className="w-full justify-start p-0 h-auto text-left"
                onClick={() => handleOpen(2)}
              >
                <Typography variant="h6" color="blue-gray" className="font-medium">
                  Preprocessing Options
                </Typography>
              </Button>
              <div className={`transition-all duration-300 ${open === 2 ? 'max-h-96 opacity-100 mt-4' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                <div className="space-y-3">
                  {[
                    { key: 'thresholding', label: 'Apply Thresholding' },
                    { key: 'denoise', label: 'Denoise Image' },
                    { key: 'deskew', label: 'Deskew Image' }
                  ].map((option) => (
                    <label key={option.key} className="flex items-center gap-3 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={preprocessingOptions[option.key]}
                        onChange={() => handleCheckboxChange(option.key)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </CardBody>
          </Card>

          <Card className="border border-blue-gray-200">
            <CardBody className="p-4">
              <Button
                variant="text"
                className="w-full justify-start p-0 h-auto text-left"
                onClick={() => handleOpen(3)}
              >
                <Typography variant="h6" color="blue-gray" className="font-medium">
                  Output Format
                </Typography>
              </Button>
              <div className={`transition-all duration-300 ${open === 3 ? 'max-h-96 opacity-100 mt-4' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                <select className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                  <option value="txt">Plain Text (.txt)</option>
                  <option value="docx">Word Document (.docx)</option>
                  <option value="pdf">PDF Document (.pdf)</option>
                </select>
              </div>
            </CardBody>
          </Card>

          <div className="mt-6 flex justify-end">
            <Button color="blue" size="sm">
              Save Settings
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
};

export default SettingsPanel;