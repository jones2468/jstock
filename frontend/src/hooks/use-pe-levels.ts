import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_PE_LEVELS,
  getAllPELevels,
  getPELevels,
  isCustomPELevels,
  resetPELevels,
  setPELevels,
  type PELevels,
} from "@/lib/pe-levels";

// 單檔股票用
export function usePELevels(code: string) {
  const [levels, setLevelsState] = useState<PELevels>(() => getPELevels(code));
  const [isCustom, setIsCustom] = useState<boolean>(() => isCustomPELevels(code));

  useEffect(() => {
    const sync = () => {
      setLevelsState(getPELevels(code));
      setIsCustom(isCustomPELevels(code));
    };
    sync();
    window.addEventListener("jstock-pe-levels-change", sync);
    return () => window.removeEventListener("jstock-pe-levels-change", sync);
  }, [code]);

  const save = useCallback(
    (next: PELevels) => {
      setPELevels(code, next);
    },
    [code]
  );

  const reset = useCallback(() => {
    resetPELevels(code);
  }, [code]);

  return { levels, isCustom, save, reset, defaults: DEFAULT_PE_LEVELS };
}

// 觀察清單一次取整張表
export function usePELevelsMap() {
  const [map, setMap] = useState<Record<string, PELevels>>(() => getAllPELevels());

  useEffect(() => {
    const sync = () => setMap(getAllPELevels());
    window.addEventListener("jstock-pe-levels-change", sync);
    return () => window.removeEventListener("jstock-pe-levels-change", sync);
  }, []);

  const get = useCallback(
    (code: string): PELevels => map[code] ?? DEFAULT_PE_LEVELS,
    [map]
  );

  return { get };
}
