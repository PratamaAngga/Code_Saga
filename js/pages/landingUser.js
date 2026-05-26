// Animasi Progress saat halaman dimuat
        window.addEventListener('load', () => {
            const targetPercent = 25;
            const bar = document.getElementById('barFill');
            const char = document.getElementById('charRunner');
            const text = document.getElementById('percentText');

            // Delay sedikit biar user liat proses larinya
            setTimeout(() => {
                bar.style.width = targetPercent + '%';
                char.style.left = targetPercent + '%';
                
                // Counter angka persen
                let current = 0;
                const interval = setInterval(() => {
                    if (current >= targetPercent) {
                        clearInterval(interval);
                    } else {
                        current++;
                        text.innerText = current + '%';
                    }
                }, 40); // Kecepatan counter
            }, 800);
        });