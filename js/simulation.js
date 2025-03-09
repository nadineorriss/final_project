/**
 * Simulation functions for the surgical journey visualization
 * This file contains functions to simulate vital signs and other patient metrics
 * based on the input parameters and Korean healthcare dataset
 */

// Store the dataset globally once loaded
let surgicalDataset = [];

/**
 * Load the dataset from CSV
 */
async function loadDataset() {
    try {
        const response = await fetch('data/relevant_columns.csv');
        const csvText = await response.text();
        
        Papa.parse(csvText, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: function(results) {
                surgicalDataset = results.data;
                console.log('Dataset loaded:', surgicalDataset.length, 'records');
            },
            error: function(error) {
                console.error('Error parsing CSV:', error);
            }
        });
    } catch (error) {
        console.error('Error loading dataset:', error);
    }
}

/**
 * Find similar patients in the dataset based on input parameters
 * @param {Object} patientData - The input patient data
 * @returns {Array} - Array of similar patients from the dataset
 */
function findSimilarPatients(patientData) {
    if (!surgicalDataset || surgicalDataset.length === 0) {
        console.warn('Dataset not loaded yet');
        return [];
    }
    
    // Calculate BMI if not provided
    if (!patientData.bmi && patientData.height && patientData.weight) {
        patientData.bmi = calculateBMI(patientData.height, patientData.weight);
    }
    
    // Find similar patients based on demographics and surgical factors
    return surgicalDataset.filter(record => {
        let matchScore = 0;
        const maxScore = 7; // Maximum possible match score
        
        // Age similarity (within 10 years)
        if (Math.abs(record.age - patientData.age) <= 10) matchScore += 1;
        
        // Sex match
        if (record.sex === patientData.sex) matchScore += 1;
        
        // BMI similarity (within 5 points)
        if (Math.abs(record.bmi - patientData.bmi) <= 5) matchScore += 1;
        
        // Department match
        if (record.department === patientData.department) matchScore += 1;
        
        // Anesthesia type match
        if (record.ane_type === patientData.ane_type) matchScore += 1;
        
        // ASA score similarity (within 1 point)
        if (Math.abs(record.asa - patientData.asa) <= 1) matchScore += 1;
        
        // Surgical approach match
        if (record.approach === patientData.approach) matchScore += 1;
        
        // Return patients with at least 4 matching criteria
        return matchScore >= 4;
    });
}

/**
 * Calculate BMI from height (cm) and weight (kg)
 * @param {number} height - Height in centimeters
 * @param {number} weight - Weight in kilograms
 * @returns {number} - BMI value
 */
function calculateBMI(height, weight) {
    // Convert height from cm to meters
    const heightInMeters = height / 100;
    return Math.round((weight / (heightInMeters * heightInMeters)) * 10) / 10;
}

/**
 * Simulate heart rate based on patient data and surgical phase
 * @param {Object} patientData - The patient data
 * @param {string} phase - The surgical phase (pre, during, post)
 * @returns {number} - Simulated heart rate
 */
function simulateHeartRate(patientData, phase, similarPatients = []) {
    // Base heart rate - use the average from similar patients if available
    let baseHeartRate = 75; // Default base rate
    
    if (similarPatients.length > 0) {
        // Calculate average heart rate from similar patients
        const sum = similarPatients.reduce((total, patient) => total + patient.avg_hr, 0);
        baseHeartRate = sum / similarPatients.length;
    } else {
        // Adjust base rate by age if no similar patients
        if (patientData.age > 60) {
            baseHeartRate -= Math.min(15, (patientData.age - 60) * 0.3);
        } else if (patientData.age < 30) {
            baseHeartRate += Math.min(10, (30 - patientData.age) * 0.5);
        }
        
        // Adjust by ASA status
        baseHeartRate += (patientData.asa - 1) * 2;
    }
    
    // Add variation based on surgical phase
    let phaseAdjustment = 0;
    let variability = 0;
    
    switch(phase) {
        case 'pre':
            // Pre-op: Slight elevation due to pre-surgical anxiety
            phaseAdjustment = 5;
            variability = 8;
            break;
        case 'during':
            // During-op: Typically lower due to anesthesia, but depends on type
            if (patientData.ane_type === 'General') {
                phaseAdjustment = -10;
                variability = 5;
            } else {
                phaseAdjustment = -5;
                variability = 10;
            }
            break;
        case 'post':
            // Post-op: Recovering, slightly elevated from baseline
            phaseAdjustment = 8;
            variability = 12;
            break;
    }
    
    // Add random variation
    const randomVariation = (Math.random() * variability * 2) - variability;
    
    // Calculate final heart rate and ensure it's within physiological limits
    let finalHeartRate = Math.round(baseHeartRate + phaseAdjustment + randomVariation);
    
    // Ensure heart rate is within physiological limits (40-180 bpm)
    finalHeartRate = Math.max(40, Math.min(180, finalHeartRate));
    
    return finalHeartRate;
}

/**
 * Simulate blood pressure based on patient data and surgical phase
 * @param {Object} patientData - The patient data
 * @param {string} phase - The surgical phase (pre, during, post)
 * @returns {Object} - Simulated blood pressure {systolic, diastolic}
 */
function simulateBloodPressure(patientData, phase) {
    // Base systolic pressure (120 mmHg for healthy adults)
    let baselineSystolic = 120;
    
    // Age adjustment (roughly +0.5 mmHg per year over 40)
    if (patientData.age > 40) {
        baselineSystolic += (patientData.age - 40) * 0.5;
    }
    
    // BMI adjustment
    if (patientData.bmi > 25) {
        baselineSystolic += (patientData.bmi - 25) * 0.8;
    }
    
    // Sex adjustment
    if (patientData.sex === 'M') {
        baselineSystolic += 5;
    }
    
    // ASA adjustment
    baselineSystolic += (patientData.asa - 1) * 5;
    
    // Surgical phase adjustments and random variation
    let systolic, diastolic;
    
    switch(phase) {
        case 'pre':
            // Anxiety might increase BP slightly
            systolic = baselineSystolic + (Math.random() * 15) - 5;
            break;
        case 'during':
            // Anesthesia typically lowers BP
            const anesthesiaEffect = patientData.ane_type === 'General' ? -20 : -10;
            systolic = baselineSystolic + anesthesiaEffect + (Math.random() * 15) - 5;
            break;
        case 'post':
            // Recovery, possibly with pain-related increases
            systolic = baselineSystolic - 5 + (Math.random() * 20) - 5;
            break;
    }
    
    // Calculate diastolic (typically around 2/3 of systolic)
    diastolic = systolic * (0.65 + (Math.random() * 0.05));
    
    // Ensure values are within physiological limits
    systolic = Math.max(80, Math.min(200, systolic));
    diastolic = Math.max(40, Math.min(110, diastolic));
    
    return {
        systolic: Math.round(systolic),
        diastolic: Math.round(diastolic)
    };
}

/**
 * Simulate oxygen saturation based on patient data and surgical phase
 * @param {Object} patientData - The patient data
 * @param {string} phase - The surgical phase (pre, during, post)
 * @returns {number} - Simulated SpO2 percentage
 */
function simulateOxygenSaturation(patientData, phase) {
    // Base SpO2 level (98% for healthy adults)
    let baselineSpO2 = 98;
    
    // Age adjustment (slightly lower baseline for elderly)
    if (patientData.age > 70) {
        baselineSpO2 -= Math.min(3, (patientData.age - 70) * 0.1);
    }
    
    // ASA adjustment
    baselineSpO2 -= (patientData.asa - 1) * 0.5;
    
    // Adjustment based on surgical phase
    let phaseAdjustment = 0;
    let variability = 0;
    
    switch(phase) {
        case 'pre':
            // Pre-op: Minor variation around baseline
            variability = 1;
            break;
        case 'during':
            // During-op: Depends on anesthesia type and surgical site
            if (patientData.ane_type === 'General') {
                // General anesthesia might cause slight decrease or even increase due to supplemental oxygen
                phaseAdjustment = 1;
                variability = 2;
                
                // Occasionally simulate a temporary drop in oxygen
                if (Math.random() < 0.2) {
                    phaseAdjustment = -3;
                }
            } else {
                // Regional anesthesia generally has less effect on respiration
                variability = 1.5;
            }
            
            // Thoracic surgery has higher risk of desaturation
            if (patientData.department === 'Thoracic surgery') {
                phaseAdjustment -= 2;
            }
            break;
        case 'post':
            // Post-op: Some variability, possibly lower due to pain, narcotics
            phaseAdjustment = -1;
            variability = 2;
            break;
    }
    
    // Add random variation
    const randomVariation = (Math.random() * variability * 2) - variability;
    
    // Calculate final SpO2 and ensure it's within physiological limits
    let finalSpO2 = baselineSpO2 + phaseAdjustment + randomVariation;
    
    // Ensure SpO2 is within physiological limits (80-100%)
    finalSpO2 = Math.max(80, Math.min(100, finalSpO2));
    
    return Math.round(finalSpO2 * 10) / 10;
}

/**
 * Generate ECG data points for visualization
 * @param {number} heartRate - The heart rate (bpm)
 * @param {number} pointCount - Number of data points to generate
 * @returns {Array} - Array of [x, y] points for ECG visualization
 */
function generateECGData(heartRate, pointCount = 100) {
    const data = [];
    const cycleLength = 60 / heartRate; // Length of one cardiac cycle in seconds
    const totalTime = 5; // Total time window to show (seconds)
    
    // Time between samples (seconds)
    const dt = totalTime / pointCount;
    
    // Generate one complete cycle as a template
    const templateCycle = [];
    const samplesPerCycle = Math.floor(cycleLength / dt);
    
    for (let i = 0; i < samplesPerCycle; i++) {
        const phase = i / samplesPerCycle;
        let value = 0;
        
        // P wave
        if (phase < 0.2) {
            value = 0.25 * Math.sin(phase / 0.2 * Math.PI);
        }
        // QRS complex
        else if (phase < 0.3) {
            value = phase < 0.25 ? -1 : 1.5;
        }
        // T wave
        else if (phase < 0.7) {
            value = 0.5 * Math.sin((phase - 0.5) / 0.4 * Math.PI);
        }
        
        templateCycle.push(value);
    }
    
    // Generate data points by repeating the template cycle
    let time = 0;
    let cycleIndex = 0;
    
    for (let i = 0; i < pointCount; i++) {
        // Add some variability to make it look more realistic
        const variability = (Math.random() * 0.05) - 0.025;
        
        // Get value from template, with wraparound
        const cyclePosition = cycleIndex % templateCycle.length;
        const value = templateCycle[cyclePosition] + variability;
        
        data.push([time, value]);
        
        time += dt;
        cycleIndex++;
    }
    
    return data;
}

/**
 * Determine surgical outcome based on patient data and similar cases
 * @param {Object} patientData - The patient data
 * @param {Array} similarPatients - Similar patients from the dataset
 * @returns {Object} - Outcome information
 */
function determineSurgicalOutcome(patientData, similarPatients) {
    const outcome = {
        survived: true,
        recoveryTime: 5, // Default recovery time in days
        complicationRisk: 'Low',
        factors: [],
        longerHospitalStay: false
    };
    
    // If we have similar patients, base outcome on their data
    if (similarPatients.length > 0) {
        // Calculate survival rate from similar patients
        const deathCount = similarPatients.filter(patient => patient.death_inhosp === 1).length;
        const survivalRate = 1 - (deathCount / similarPatients.length);
        
        // Determine survival (most patients survive, but respect dataset statistics)
        outcome.survived = Math.random() < survivalRate;
        
        // Calculate average length of stay
        let totalLOS = 0;
        let losCount = 0;
        
        similarPatients.forEach(patient => {
            if (patient.los_postop !== null && patient.los_postop !== undefined) {
                totalLOS += patient.los_postop;
                losCount++;
            }
        });
        
        if (losCount > 0) {
            outcome.recoveryTime = Math.round(totalLOS / losCount);
        }
    } else {
        // Without similar patients, use demographic risk factors
        let mortalityRisk = 0.01; // Base risk of 1%
        
        // Age risk
        if (patientData.age > 70) mortalityRisk += 0.02;
        else if (patientData.age > 60) mortalityRisk += 0.01;
        
        // ASA risk
        mortalityRisk += (patientData.asa - 1) * 0.015;
        
        // Emergency surgery risk
        if (patientData.emop) mortalityRisk += 0.03;
        
        // Determine survival
        outcome.survived = Math.random() > mortalityRisk;
        
        // Estimate recovery time based on surgery complexity
        if (patientData.department === 'Thoracic surgery') outcome.recoveryTime += 3;
        if (patientData.approach === 'Open') outcome.recoveryTime += 2;
        if (patientData.asa > 2) outcome.recoveryTime += (patientData.asa - 2) * 2;
    }
    
    // Determine complication risk
    let complicationScore = 0;
    
    // Age factor
    if (patientData.age > 65) {
        complicationScore += 2;
        outcome.factors.push('Advanced age increases complication risk');
    }
    
    // ASA factor
    if (patientData.asa >= 3) {
        complicationScore += 3;
        outcome.factors.push('Higher ASA physical status associated with increased risk');
    }
    
    // BMI factor
    if (patientData.bmi > 30) {
        complicationScore += 2;
        outcome.factors.push('Elevated BMI associated with increased complication risk');
    } else if (patientData.bmi < 18.5) {
        complicationScore += 1;
        outcome.factors.push('Low BMI may impact recovery');
    }
    
    // Surgery type factor
    if (patientData.department === 'Thoracic surgery') {
        complicationScore += 2;
        outcome.factors.push('Thoracic procedures have higher complication rates');
    }
    
    // Approach factor
    if (patientData.approach === 'Open') {
        complicationScore += 1;
        outcome.factors.push('Open surgical approach typically requires longer recovery');
    } else if (patientData.approach === 'Robotic') {
        complicationScore -= 1;
        outcome.factors.push('Robotic approach may reduce complications');
    }
    
    // Set complication risk based on score
    if (complicationScore >= 5) {
        outcome.complicationRisk = 'High';
    } else if (complicationScore >= 3) {
        outcome.complicationRisk = 'Moderate';
    }
    
    // Determine if hospital stay might be longer than expected
    outcome.longerHospitalStay = complicationScore >= 4;
    
    // Add survival outcome factor
    if (!outcome.survived) {
        outcome.factors.push('Multiple risk factors contributed to negative outcome');
    } else if (outcome.complicationRisk === 'Low') {
        outcome.factors.push('Low risk profile contributed to positive outcome');
    }
    
    return outcome;
}

/**
 * Generate narrative descriptions for each surgical phase
 * @param {Object} patientData - The patient data
 * @param {Object} vitalSigns - The simulated vital signs
 * @param {string} phase - The surgical phase
 * @returns {string} - Narrative description
 */
function generateNarrative(patientData, vitalSigns, phase) {
    const age = patientData.age;
    const sex = patientData.sex === 'M' ? 'male' : 'female';
    const department = patientData.department;
    const approach = patientData.approach.toLowerCase();
    const anesthesia = patientData.ane_type.toLowerCase();
    
    const hr = vitalSigns.heartRate;
    const bp = `${vitalSigns.bloodPressure.systolic}/${vitalSigns.bloodPressure.diastolic}`;
    const spo2 = vitalSigns.oxygenSaturation;
    
    let narrative = '';
    
    switch(phase) {
        case 'pre':
            narrative = `Patient is a ${age}-year-old ${sex} scheduled for ${approach} ${department.toLowerCase()} procedure under ${anesthesia} anesthesia. `;
            narrative += `Vital signs are stable with heart rate of ${hr} bpm, blood pressure of ${bp} mmHg, and oxygen saturation at ${spo2}%. `;
            
            if (patientData.asa >= 3) {
                narrative += `ASA physical status ${patientData.asa} indicates significant pre-existing health concerns. `;
            } else {
                narrative += `ASA physical status ${patientData.asa} indicates ${patientData.asa === 1 ? 'a healthy patient' : 'mild systemic disease'}. `;
            }
            
            narrative += 'Patient has been prepared for surgery and anesthesia will begin shortly.';
            break;
            
        case 'during':
            narrative = `Patient is now under ${anesthesia} anesthesia for ${approach} ${department.toLowerCase()} procedure. `;
            narrative += `Current vital signs show heart rate of ${hr} bpm, blood pressure of ${bp} mmHg, and oxygen saturation at ${spo2}%. `;
            
            // Add some procedure-specific details
            if (department === 'General surgery') {
                narrative += 'Abdominal access has been established and the surgical team is proceeding with the planned intervention. ';
            } else if (department === 'Thoracic surgery') {
                narrative += 'Thoracic access has been established and the procedure is underway with careful monitoring of respiratory parameters. ';
            } else if (department === 'Gynecology') {
                narrative += 'Pelvic access has been established and the surgical team is proceeding with the gynecological procedure. ';
            } else if (department === 'Urology') {
                narrative += 'Urological procedure is in progress with the surgical team maintaining careful attention to fluid balance. ';
            }
            
            // Add anesthesia-specific details
            if (anesthesia === 'general') {
                narrative += 'Anesthesia is being maintained at appropriate depth with stable parameters. ';
            } else if (anesthesia === 'spinal') {
                narrative += 'Spinal block is providing adequate anesthesia with patient remaining stable. ';
            } else {
                narrative += 'Sedation is being maintained at appropriate level with patient remaining comfortable. ';
            }
            
            // Add vital signs interpretation
            if (hr > 100) {
                narrative += 'Note: Heart rate is slightly elevated and being monitored closely. ';
            } else if (hr < 60) {
                narrative += 'Note: Heart rate is on the lower side but within acceptable limits for anesthesia. ';
            }
            
            if (vitalSigns.bloodPressure.systolic > 160 || vitalSigns.bloodPressure.diastolic > 100) {
                narrative += 'Blood pressure is elevated and being addressed. ';
            } else if (vitalSigns.bloodPressure.systolic < 90) {
                narrative += 'Blood pressure is running low but within manageable range. ';
            }
            
            if (spo2 < 94) {
                narrative += 'Oxygen saturation is below optimal levels and being closely monitored. ';
            }
            break;
            
        case 'post':
            narrative = `Patient has completed ${approach} ${department.toLowerCase()} procedure under ${anesthesia} anesthesia and is now in recovery. `;
            narrative += `Current vital signs show heart rate of ${hr} bpm, blood pressure of ${bp} mmHg, and oxygen saturation at ${spo2}%. `;
            
            if (anesthesia === 'general') {
                narrative += 'Patient is emerging from general anesthesia with protective reflexes returning. ';
            } else if (anesthesia === 'spinal') {
                narrative += 'Spinal anesthesia is gradually resolving with return of motor function expected. ';
            } else {
                narrative += 'Sedation effects are diminishing and patient is becoming more alert. ';
            }
            
            // Add recovery-specific details
            if (department === 'General surgery' || department === 'Thoracic surgery') {
                narrative += 'Pain is being managed with appropriate analgesics. ';
            }
            
            if (approach === 'Open') {
                narrative += 'Surgical site has been dressed and shows no immediate concerns. ';
            } else {
                narrative += 'Minimal access sites have been dressed and appear clean. ';
            }
            
            narrative += 'Recovery is proceeding as expected with continued monitoring.';
            break;
    }
    
    return narrative;
}