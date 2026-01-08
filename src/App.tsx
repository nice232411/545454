import { useEffect, useRef, useState } from 'react';
import ConeAnimation from './cone-animation';
import { Play, Pause, RotateCcw, Eye, EyeOff } from 'lucide-react';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<ConeAnimation | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showFrames, setShowFrames] = useState(true);
  const [loopAnimation, setLoopAnimation] = useState(true);
  const [radius, setRadius] = useState(1);
  const [height, setHeight] = useState(2);
  const [segments, setSegments] = useState(32);
  const [speed, setSpeed] = useState(0.01);
  const [startAxis, setStartAxis] = useState({ x: 0, y: 1, z: 0 });
  const [endAxis, setEndAxis] = useState({ x: 1, y: 0, z: 0 });

  useEffect(() => {
    if (canvasRef.current && !animationRef.current) {
      animationRef.current = new ConeAnimation('webgl-canvas');
      animationRef.current.initialize();
    }
  }, []);

  const handlePlayPause = () => {
    if (!animationRef.current) return;
    if (isAnimating) {
      animationRef.current.stopAnimation();
    } else {
      animationRef.current.startAnimation();
    }
    setIsAnimating(!isAnimating);
  };

  const handleReset = () => {
    if (!animationRef.current) return;
    animationRef.current.resetAnimation();
    setIsAnimating(false);
  };

  const handleToggleFrames = () => {
    if (!animationRef.current) return;
    const newValue = !showFrames;
    setShowFrames(newValue);
    animationRef.current.setShowIntermediateFrames(newValue);
  };

  const handleConeParamsChange = () => {
    if (!animationRef.current) return;
    animationRef.current.setConeParams({ radius, height, segments });
  };

  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
    if (animationRef.current) {
      animationRef.current.setAnimationSpeed(newSpeed);
    }
  };

  const handleStartAxisChange = (axis: 'x' | 'y' | 'z', value: number) => {
    const newAxis = { ...startAxis, [axis]: value };
    setStartAxis(newAxis);
    if (animationRef.current) {
      animationRef.current.setStartAxis([newAxis.x, newAxis.y, newAxis.z]);
    }
  };

  const handleEndAxisChange = (axis: 'x' | 'y' | 'z', value: number) => {
    const newAxis = { ...endAxis, [axis]: value };
    setEndAxis(newAxis);
    if (animationRef.current) {
      animationRef.current.setEndAxis([newAxis.x, newAxis.y, newAxis.z]);
    }
  };

  const handleLoopChange = () => {
    const newLoop = !loopAnimation;
    setLoopAnimation(newLoop);
    if (animationRef.current) {
      animationRef.current.setLoopAnimation(newLoop);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Анимация конуса с SLERP</h1>
          <p className="text-slate-400">Сферическая интерполяция кватернионов (Spherical Linear Interpolation)</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-slate-800 rounded-lg shadow-2xl p-6">
              <canvas
                ref={canvasRef}
                id="webgl-canvas"
                width="800"
                height="600"
                className="w-full rounded-lg bg-slate-950"
              />

              <div className="flex gap-3 mt-6 justify-center">
                <button
                  onClick={handlePlayPause}
                  className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors font-medium"
                >
                  {isAnimating ? <Pause size={20} /> : <Play size={20} />}
                  {isAnimating ? 'Пауза' : 'Старт'}
                </button>

                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors font-medium"
                >
                  <RotateCcw size={20} />
                  Сброс
                </button>

                <button
                  onClick={handleToggleFrames}
                  className="flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors font-medium"
                >
                  {showFrames ? <Eye size={20} /> : <EyeOff size={20} />}
                  {showFrames ? 'Скрыть кадры' : 'Показать кадры'}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-800 rounded-lg shadow-xl p-6">
              <h2 className="text-xl font-semibold mb-4 text-emerald-400">Параметры конуса</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-slate-300">
                    Радиус: {radius.toFixed(2)}
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={radius}
                    onChange={(e) => setRadius(parseFloat(e.target.value))}
                    onMouseUp={handleConeParamsChange}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-slate-300">
                    Высота: {height.toFixed(2)}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="4"
                    step="0.1"
                    value={height}
                    onChange={(e) => setHeight(parseFloat(e.target.value))}
                    onMouseUp={handleConeParamsChange}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-slate-300">
                    Сегменты: {segments}
                  </label>
                  <input
                    type="range"
                    min="8"
                    max="64"
                    step="4"
                    value={segments}
                    onChange={(e) => setSegments(parseInt(e.target.value))}
                    onMouseUp={handleConeParamsChange}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-slate-300">
                    Скорость: {speed.toFixed(3)}
                  </label>
                  <input
                    type="range"
                    min="0.001"
                    max="0.05"
                    step="0.001"
                    value={speed}
                    onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="loop-animation"
                    checked={loopAnimation}
                    onChange={handleLoopChange}
                    className="w-4 h-4 accent-emerald-600 cursor-pointer"
                  />
                  <label htmlFor="loop-animation" className="text-sm font-medium text-slate-300 cursor-pointer">
                    Зацикленная анимация
                  </label>
                </div>
              </div>
            </div>

            <div className="bg-slate-800 rounded-lg shadow-xl p-6">
              <h2 className="text-xl font-semibold mb-4 text-emerald-400">Начальная ориентация</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-slate-300">
                    X: {startAxis.x.toFixed(2)}
                  </label>
                  <input
                    type="range"
                    min="-1"
                    max="1"
                    step="0.1"
                    value={startAxis.x}
                    onChange={(e) => handleStartAxisChange('x', parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-slate-300">
                    Y: {startAxis.y.toFixed(2)}
                  </label>
                  <input
                    type="range"
                    min="-1"
                    max="1"
                    step="0.1"
                    value={startAxis.y}
                    onChange={(e) => handleStartAxisChange('y', parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-slate-300">
                    Z: {startAxis.z.toFixed(2)}
                  </label>
                  <input
                    type="range"
                    min="-1"
                    max="1"
                    step="0.1"
                    value={startAxis.z}
                    onChange={(e) => handleStartAxisChange('z', parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>
              </div>
            </div>

            <div className="bg-slate-800 rounded-lg shadow-xl p-6">
              <h2 className="text-xl font-semibold mb-4 text-emerald-400">Конечная ориентация</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-slate-300">
                    X: {endAxis.x.toFixed(2)}
                  </label>
                  <input
                    type="range"
                    min="-1"
                    max="1"
                    step="0.1"
                    value={endAxis.x}
                    onChange={(e) => handleEndAxisChange('x', parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-slate-300">
                    Y: {endAxis.y.toFixed(2)}
                  </label>
                  <input
                    type="range"
                    min="-1"
                    max="1"
                    step="0.1"
                    value={endAxis.y}
                    onChange={(e) => handleEndAxisChange('y', parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-slate-300">
                    Z: {endAxis.z.toFixed(2)}
                  </label>
                  <input
                    type="range"
                    min="-1"
                    max="1"
                    step="0.1"
                    value={endAxis.z}
                    onChange={(e) => handleEndAxisChange('z', parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>
              </div>
            </div>

            <div className="bg-slate-800 rounded-lg shadow-xl p-6">
              <h2 className="text-xl font-semibold mb-4 text-emerald-400">Информация</h2>
              <ul className="space-y-2 text-sm text-slate-300">
                <li>• <span className="text-red-500">Красная ось</span> - X</li>
                <li>• <span className="text-green-500">Зеленая ось</span> - Y</li>
                <li>• <span className="text-blue-500">Синяя ось</span> - Z</li>
                <li>• <span className="text-yellow-400">Желтый вектор</span> - начальная ориентация</li>
                <li>• <span className="text-orange-500">Оранжевый вектор</span> - конечная ориентация</li>
                <li>• Промежуточные кадры показывают траекторию SLERP</li>
                <li>• 20 промежуточных кадров для плавности</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
