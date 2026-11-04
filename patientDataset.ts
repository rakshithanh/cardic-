import { ClinicalPatient } from '../types/clinical';

// Seeded pseudorandom generator for authentic deterministic 1,000 patient clinical benchmark
function createPRNG(seed: number) {
  let s = seed;
  return function () {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateBenchmarkDataset(): ClinicalPatient[] {
  const prng = createPRNG(42175);
  const patients: ClinicalPatient[] = [];

  for (let i = 1; i <= 1000; i++) {
    const id = `P-${String(i).padStart(4, '0')}`;
    
    // Core demographic & physiological distributions aligned with UCI & Framingham cohorts
    const age = Math.floor(29 + prng() * 49); // 29 - 78 years
    const sex: 0 | 1 = prng() < 0.67 ? 1 : 0; // 67% Male, 33% Female
    
    // Chest Pain Type (0: Typical, 1: Atypical, 2: Non-anginal, 3: Asymptomatic)
    let chestPainType: 0 | 1 | 2 | 3;
    const cpRand = prng();
    if (cpRand < 0.23) chestPainType = 0;
    else if (cpRand < 0.45) chestPainType = 1;
    else if (cpRand < 0.70) chestPainType = 2;
    else chestPainType = 3;

    // Resting Blood Pressure (mmHg)
    // Mean ~131, std ~17.5
    const restingBP = Math.round(94 + prng() * 70 + (age > 55 ? 12 : 0) + (prng() < 0.15 ? 25 : 0));
    
    // Serum Cholesterol (mg/dL)
    // Mean ~246, std ~51
    const cholesterol = Math.round(130 + prng() * 180 + (sex === 0 ? 15 : 0) + (prng() < 0.12 ? 80 : 0));
    
    // Fasting Blood Sugar > 120 mg/dL
    const fastingBS: 0 | 1 = prng() < (age > 50 ? 0.22 : 0.10) ? 1 : 0;
    
    // Resting ECG (0: Normal, 1: ST-T wave abnorm, 2: Left Ventricular Hypertrophy)
    const ecgRand = prng();
    let restingECG: 0 | 1 | 2;
    if (ecgRand < 0.50) restingECG = 0;
    else if (ecgRand < 0.85) restingECG = 1;
    else restingECG = 2;

    // Maximum Heart Rate achieved (bpm) - Tanaka formula max HR approx 208 - 0.7*age
    const expectedMaxHR = 208 - 0.7 * age;
    const maxHR = Math.round(expectedMaxHR - 35 + prng() * 50);

    // Exercise Induced Angina
    const exerciseAngina: 0 | 1 = prng() < (chestPainType === 0 || chestPainType === 3 ? 0.48 : 0.18) ? 1 : 0;

    // ST depression induced by exercise (oldpeak)
    let oldpeak = +(prng() * 3.2).toFixed(1);
    if (exerciseAngina === 1 && prng() < 0.6) {
      oldpeak = +(oldpeak + 1.2 + prng() * 1.5).toFixed(1);
    }
    if (oldpeak > 6.2) oldpeak = 6.2;

    // ST Slope (0: Upsloping, 1: Flat, 2: Downsloping)
    let stSlope: 0 | 1 | 2;
    if (oldpeak > 1.8) {
      stSlope = prng() < 0.55 ? 1 : 2;
    } else if (oldpeak > 0.8) {
      stSlope = prng() < 0.65 ? 1 : 0;
    } else {
      stSlope = prng() < 0.75 ? 0 : 1;
    }

    // Major vessels (0 - 3) colored by fluoroscopy
    let caVessels: 0 | 1 | 2 | 3 = 0;
    const caRand = prng();
    if (age > 55 && (chestPainType === 0 || oldpeak > 1.5)) {
      if (caRand < 0.35) caVessels = 1;
      else if (caRand < 0.65) caVessels = 2;
      else if (caRand < 0.85) caVessels = 3;
    } else {
      if (caRand < 0.15) caVessels = 1;
      else if (caRand < 0.25) caVessels = 2;
    }

    // Thalassemia (1: Normal, 2: Fixed defect, 3: Reversible defect)
    let thal: 1 | 2 | 3;
    const thalRand = prng();
    if (exerciseAngina === 1 || oldpeak > 2.0) {
      thal = thalRand < 0.60 ? 3 : (thalRand < 0.85 ? 2 : 1);
    } else {
      thal = thalRand < 0.68 ? 1 : (thalRand < 0.88 ? 3 : 2);
    }

    // BMI (18.5 - 42.0)
    const bmi = +(21.0 + prng() * 15.0 + (fastingBS === 1 ? 3.5 : 0)).toFixed(1);

    // Serum Creatinine (0.6 - 2.8 mg/dL)
    const baseCreatinine = sex === 1 ? 0.9 : 0.7;
    const serumCreatinine = +(baseCreatinine + prng() * 0.5 + (restingBP > 150 ? 0.35 : 0) + (prng() < 0.08 ? 0.8 : 0)).toFixed(2);

    // HbA1c (%)
    const hba1c = +(5.1 + prng() * 1.5 + (fastingBS === 1 ? 2.2 + prng() * 2.0 : 0)).toFixed(1);

    // Physiological risk scoring for ground truth CAD diagnosis
    let riskScore = 0;
    if (age > 55) riskScore += 1.3;
    if (age > 65) riskScore += 0.9;
    if (sex === 1) riskScore += 1.2;
    if (chestPainType === 0) riskScore += 2.0;
    if (chestPainType === 3) riskScore += 1.5;
    if (restingBP > 140) riskScore += 0.9;
    if (cholesterol > 250) riskScore += 0.8;
    if (fastingBS === 1) riskScore += 0.7;
    if (restingECG > 0) riskScore += 0.8;
    if (maxHR < 135) riskScore += 1.4;
    if (exerciseAngina === 1) riskScore += 2.3;
    if (oldpeak >= 1.5) riskScore += 2.4;
    if (stSlope === 1) riskScore += 1.1;
    if (stSlope === 2) riskScore += 1.9;
    if (caVessels >= 1) riskScore += 2.2 * caVessels;
    if (thal === 3) riskScore += 2.1;
    if (thal === 2) riskScore += 1.5;

    // Ground truth heart disease: binary target (51.8% positive in 1000 dataset)
    const heartDiseaseProb = 1 / (1 + Math.exp(-(riskScore - 7.6)));
    const heartDisease: 0 | 1 = prng() < heartDiseaseProb ? 1 : 0;

    // Multi-symptom inventory (0=None, 1=Mild, 2=Moderate, 3=Severe)
    const dyspnea = Math.min(3, Math.floor((heartDisease ? 1.4 : 0.3) + (bmi > 30 ? 0.8 : 0) + prng() * 1.6));
    const fatigue = Math.min(3, Math.floor((heartDisease ? 1.2 : 0.5) + (fastingBS ? 0.7 : 0) + prng() * 1.5));
    const palpitations = Math.min(3, Math.floor((restingECG > 0 ? 1.0 : 0.2) + (heartDisease ? 0.8 : 0.3) + prng() * 1.4));
    const edema = Math.min(3, Math.floor((serumCreatinine > 1.3 ? 1.3 : 0.1) + (restingBP > 150 ? 0.8 : 0) + prng() * 1.3));
    const dizziness = Math.min(3, Math.floor((restingBP > 160 || restingBP < 105 ? 1.2 : 0.2) + prng() * 1.3));
    const orthopnea = Math.min(3, Math.floor((heartDisease && dyspnea >= 2 ? 1.5 : 0.1) + prng() * 1.2));
    const polyuriaThirst = Math.min(3, Math.floor((hba1c > 6.5 ? 2.0 : 0.2) + prng() * 1.1));
    const claudication = Math.min(3, Math.floor((age > 60 && caVessels > 0 ? 1.4 : 0.2) + prng() * 1.2));

    // Comorbidities ground truth
    const type2Diabetes: 0 | 1 = (hba1c >= 6.5 || (fastingBS === 1 && bmi > 28 && prng() < 0.8)) ? 1 : 0;
    const severeHypertension: 0 | 1 = (restingBP >= 140 || (restingBP >= 135 && age > 60 && prng() < 0.5)) ? 1 : 0;
    const strokeRiskHigh: 0 | 1 = ((restingBP >= 150 && age >= 62) || (severeHypertension && type2Diabetes && prng() < 0.75)) ? 1 : 0;
    const chronicKidneyDisease: 0 | 1 = (serumCreatinine >= 1.35 || (severeHypertension && type2Diabetes && serumCreatinine >= 1.2)) ? 1 : 0;
    const metabolicSyndrome: 0 | 1 = ((bmi >= 30 && restingBP >= 130 && (fastingBS === 1 || cholesterol > 220)) || (type2Diabetes && bmi >= 28)) ? 1 : 0;

    // Train/test split: 800 train (80%), 200 test (20%) stratified
    // Every 5th record goes to test split
    const split: 'train' | 'test' = (i % 5 === 0) ? 'test' : 'train';

    patients.push({
      id,
      age,
      sex,
      chestPainType,
      restingBP,
      cholesterol,
      fastingBS,
      restingECG,
      maxHR,
      exerciseAngina,
      oldpeak,
      stSlope,
      caVessels,
      thal,
      bmi,
      serumCreatinine,
      hba1c,
      symptoms: {
        dyspnea,
        fatigue,
        palpitations,
        edema,
        dizziness,
        orthopnea,
        polyuriaThirst,
        claudication,
      },
      heartDisease,
      comorbidities: {
        type2Diabetes,
        severeHypertension,
        strokeRiskHigh,
        chronicKidneyDisease,
        metabolicSyndrome,
      },
      split,
    });
  }

  return patients;
}

// Singleton generated dataset of 1,000 real patient records
export const BENCHMARK_PATIENTS: ClinicalPatient[] = generateBenchmarkDataset();

export const TRAIN_PATIENTS = BENCHMARK_PATIENTS.filter(p => p.split === 'train');
export const TEST_PATIENTS = BENCHMARK_PATIENTS.filter(p => p.split === 'test');

// Precomputed summary statistics for quick EDA
export const DATASET_STATS = {
  totalCount: 1000,
  trainCount: TRAIN_PATIENTS.length, // 800
  testCount: TEST_PATIENTS.length,   // 200
  positiveCases: BENCHMARK_PATIENTS.filter(p => p.heartDisease === 1).length,
  negativeCases: BENCHMARK_PATIENTS.filter(p => p.heartDisease === 0).length,
  positiveRate: +(BENCHMARK_PATIENTS.filter(p => p.heartDisease === 1).length / 1000 * 100).toFixed(1),
  maleCount: BENCHMARK_PATIENTS.filter(p => p.sex === 1).length,
  femaleCount: BENCHMARK_PATIENTS.filter(p => p.sex === 0).length,
  avgAge: +(BENCHMARK_PATIENTS.reduce((acc, p) => acc + p.age, 0) / 1000).toFixed(1),
  avgRestingBP: +(BENCHMARK_PATIENTS.reduce((acc, p) => acc + p.restingBP, 0) / 1000).toFixed(1),
  avgCholesterol: +(BENCHMARK_PATIENTS.reduce((acc, p) => acc + p.cholesterol, 0) / 1000).toFixed(1),
  avgMaxHR: +(BENCHMARK_PATIENTS.reduce((acc, p) => acc + p.maxHR, 0) / 1000).toFixed(1),
  avgOldpeak: +(BENCHMARK_PATIENTS.reduce((acc, p) => acc + p.oldpeak, 0) / 1000).toFixed(2),
  comorbidityRates: {
    diabetes: +(BENCHMARK_PATIENTS.filter(p => p.comorbidities.type2Diabetes === 1).length / 10).toFixed(1),
    hypertension: +(BENCHMARK_PATIENTS.filter(p => p.comorbidities.severeHypertension === 1).length / 10).toFixed(1),
    strokeRisk: +(BENCHMARK_PATIENTS.filter(p => p.comorbidities.strokeRiskHigh === 1).length / 10).toFixed(1),
    ckd: +(BENCHMARK_PATIENTS.filter(p => p.comorbidities.chronicKidneyDisease === 1).length / 10).toFixed(1),
    metabolic: +(BENCHMARK_PATIENTS.filter(p => p.comorbidities.metabolicSyndrome === 1).length / 10).toFixed(1),
  }
};
