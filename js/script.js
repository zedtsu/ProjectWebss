document.addEventListener('DOMContentLoaded', function() {
    const bpmSlider = document.getElementById('bpm');
    const bpmValue = document.getElementById('bpmValue');
    
    bpmValue.textContent = bpmSlider.value;
    
    bpmSlider.addEventListener('input', function() {
        bpmValue.textContent = this.value;
    });
});