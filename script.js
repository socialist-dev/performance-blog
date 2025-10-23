document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');
    const rootEl = document.documentElement;

    // Set initial toggle state based on the class set by the anti-FOUC script
    if (rootEl.classList.contains('dark-mode')) {
        themeToggle.checked = true;
    }

    // --- Rerenderable Mermaid Chart Logic ---
    const renderMermaidCharts = () => {
        if (typeof mermaid === 'undefined' || !document.querySelector('.mermaid')) {
            return;
        }
        
        console.log('Rendering/Re-rendering Mermaid charts...');
        const isDarkMode = rootEl.classList.contains('dark-mode');
        mermaid.initialize({
            startOnLoad: false,
            theme: isDarkMode ? 'dark' : 'default'
        });

        const mermaidElements = document.querySelectorAll('pre.mermaid');
        mermaidElements.forEach((element, index) => {
            // Store the original definition if it's not already there
            if (!element.dataset.definition) {
                element.dataset.definition = element.textContent;
            }
            const graphDefinition = element.dataset.definition;
            const id = 'mermaid-chart-' + index;
            
            element.innerHTML = '';
            element.removeAttribute('data-processed');
            
            mermaid.render(id, graphDefinition).then(({ svg, bindFunctions }) => {
                element.innerHTML = svg;
                if (bindFunctions) {
                    bindFunctions(element);
                }
                console.log('Mermaid chart rendered successfully:', id);
            }).catch(error => {
                console.error('Mermaid rendering failed for chart:', id, error);
                element.innerHTML = '<div style="color: red;">Error rendering chart: ' + error.message + '</div>';
            });
        });
    };

    // Initial render on page load
    renderMermaidCharts();

    // Function to handle theme switching without reloading
    const switchTheme = () => {
        if (themeToggle.checked) {
            rootEl.classList.add('dark-mode');
            localStorage.setItem('theme', 'dark');
        } else {
            rootEl.classList.remove('dark-mode');
            localStorage.setItem('theme', 'light');
        }
        
        renderMermaidCharts();
        $(document).trigger('theme:changed');
    };

    // Add event listener for the theme toggle
    themeToggle.addEventListener('change', switchTheme);

    // Badge Filter Logic
    const filterContainer = document.querySelector('.filter-badges');
    if (filterContainer) {
        const filterButtons = filterContainer.querySelectorAll('.filter-btn');
        const postItems = document.querySelectorAll('.post-list li[data-badge]');

        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                const filter = button.getAttribute('data-badge');

                // Update active button
                filterButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                // Filter posts
                postItems.forEach(item => {
                    if (filter === 'all' || item.getAttribute('data-badge') === filter) {
                        item.classList.remove('hidden');
                    } else {
                        item.classList.add('hidden');
                    }
                });
            });
        });
    }

    // Scroll to Top Button Logic
    const scrollToTopBtn = document.getElementById('scrollToTopBtn');
    if (scrollToTopBtn) {
        // Show or hide the button based on scroll position
        window.onscroll = function() {
            // Show button if user has scrolled down 400px
            if (document.body.scrollTop > 400 || document.documentElement.scrollTop > 400) {
                scrollToTopBtn.style.display = "flex";
            } else {
                scrollToTopBtn.style.display = "none";
            }
        };

        // Scroll to the top when the button is clicked
        scrollToTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // === Tab Switching Logic ===
    $(function() {
        $('.tab-link').on('click', function(e) {
            e.preventDefault();
            
            const target = $(this).attr('href');

            // Update active class on tabs
            $('.tab-link').removeClass('active');
            $(this).addClass('active');

            // Show/hide content panes
            $('.tab-content').removeClass('active');
            $(target).addClass('active');
        });
    });

    // === Eisenhower Matrix Tool Logic (v2 - Direct DOM Manipulation) ===
    $(function() {
        const taskInput = $('#task-input');
        const addTaskBtn = $('#add-task-btn');
        const matrixContainer = $('.eisenhower-matrix');
        const completionRateChartCtx = document.getElementById('completionRateChart');
        const quadrantCompletionChartCtx = document.getElementById('quadrantCompletionChart');
        let completionChart, quadrantChart;

        if (taskInput.length) {
            let tasks = JSON.parse(localStorage.getItem('eisenhowerTasks')) || { do: [], schedule: [], delegate: [], eliminate: [] };

            const saveTasks = () => {
                localStorage.setItem('eisenhowerTasks', JSON.stringify(tasks));
                updateChartsAndInsights();
            };

            const createTaskElement = (taskObj) => {
                return $('<li></li>')
                    .addClass('task-item')
                    .attr('data-task-id', taskObj.id)
                    .html(`
                        <span class="task-number"></span>
                        <span class="task-name">${taskObj.text}</span>
                        <div class="task-actions">
                            <button class="complete-btn" title="Hoàn thành"><i class="ph ph-check-circle"></i></button>
                            <button class="delete-btn" title="Xóa"><i class="ph ph-trash"></i></button>
                        </div>
                    `);
            };

            const renderAllTasks = () => {
                matrixContainer.find('.task-list').empty();
                $.each(tasks, (quadrant, taskList) => {
                    taskList.forEach(taskObj => {
                        const li = createTaskElement(taskObj);
                        if (taskObj.completed) {
                            li.addClass('completed');
                            li.find('.complete-btn').prop('disabled', true).find('i').removeClass('ph-check-circle').addClass('ph-check-circle-fill');
                        }
                        matrixContainer.find(`#${quadrant}-list`).append(li);
                    });
                });
                updateNumbering();
                updateChartsAndInsights();
            };

            const updateNumbering = () => {
                matrixContainer.find('.task-list').each(function() {
                    $(this).find('.task-item').each(function(index) {
                        $(this).find('.task-number').text(`${index + 1}.`);
                    });
                });
            };

            const syncDataFromDOM = () => {
                tasks = { do: [], schedule: [], delegate: [], eliminate: [] };
                matrixContainer.find('.task-list').each(function() {
                    const quadrant = $(this).attr('id').replace('-list', '');
                    $(this).find('.task-item').each(function() {
                        tasks[quadrant].push({
                            id: $(this).attr('data-task-id'),
                            text: $(this).find('.task-name').text(),
                            completed: $(this).hasClass('completed')
                        });
                    });
                });
                saveTasks();
            };

            // --- Event Listeners ---
            addTaskBtn.on('click', () => {
                const taskText = taskInput.val().trim();
                if (taskText) {
                    const newTask = { id: Date.now().toString(), text: taskText, completed: false };
                    const li = createTaskElement(newTask);
                    $('#do-list').append(li);
                    taskInput.val('');
                    syncDataFromDOM();
                    updateNumbering();
                }
            });
            taskInput.on('keypress', (e) => { if (e.key === 'Enter') addTaskBtn.click(); });

            matrixContainer.on('click', '.delete-btn', function() {
                $(this).closest('.task-item').remove();
                syncDataFromDOM();
                updateNumbering();
            });

            matrixContainer.on('click', '.complete-btn', function() {
                const button = $(this);
                if (button.is(':disabled')) return;
                const li = button.closest('.task-item');
                li.addClass('completed');
                button.prop('disabled', true).find('i').removeClass('ph-check-circle').addClass('ph-check-circle-fill');
                syncDataFromDOM();
            });

            // --- Sortable (Drag and Drop) ---
            matrixContainer.find('.task-list').sortable({
                connectWith: '.task-list',
                placeholder: 'task-placeholder',
                start: (event, ui) => ui.item.addClass('dragging'),
                stop: (event, ui) => {
                    ui.item.removeClass('dragging');
                    syncDataFromDOM();
                    updateNumbering();
                }
            }).disableSelection();

            // --- Chart.js and Insights Logic ---
            const updateChartsAndInsights = () => {
                let totalTasks = 0;
                let completedTasks = 0;
                const quadrantStats = { do: { total: 0, completed: 0 }, schedule: { total: 0, completed: 0 }, delegate: { total: 0, completed: 0 }, eliminate: { total: 0, completed: 0 } };

                $.each(tasks, (quadrant, taskList) => {
                    totalTasks += taskList.length;
                    quadrantStats[quadrant].total = taskList.length;
                    taskList.forEach(task => {
                        if (task.completed) {
                            completedTasks++;
                            quadrantStats[quadrant].completed++;
                        }
                    });
                });

                const isDarkMode = document.documentElement.classList.contains('dark-mode');
                const textColor = isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)';
                const chartColors = {
                    completed: isDarkMode ? '#c8c1b1' : '#111111',
                    pending: '#555555',
                    glow: '#ffffe4'
                };

                // Completion Rate Chart (Pie Chart)
                if (completionChart) completionChart.destroy();
                completionChart = new Chart(completionRateChartCtx, {
                    type: 'pie',
                    data: {
                        labels: ['Hoàn thành', 'Chưa hoàn thành'],
                        datasets: [{
                            data: [completedTasks, totalTasks - completedTasks],
                            backgroundColor: [chartColors.completed, chartColors.pending],
                            borderColor: [chartColors.glow, '#888'],
                            borderWidth: 2,
                            hoverOffset: 4
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: { position: 'top', labels: { color: textColor } },
                            title: { display: true, text: 'Tỷ lệ hoàn thành công việc', color: textColor }
                        }
                    }
                });

                // Quadrant Completion Chart (Bar Chart)
                if (quadrantChart) quadrantChart.destroy();
                quadrantChart = new Chart(quadrantCompletionChartCtx, {
                    type: 'bar',
                    data: {
                        labels: ['Làm ngay', 'Lên lịch', 'Ủy quyền', 'Loại bỏ'],
                        datasets: [{
                            label: 'Hoàn thành',
                            data: [quadrantStats.do.completed, quadrantStats.schedule.completed, quadrantStats.delegate.completed, quadrantStats.eliminate.completed],
                            backgroundColor: chartColors.completed,
                            borderColor: chartColors.glow,
                            borderWidth: 2
                        }, {
                            label: 'Tổng số',
                            data: [quadrantStats.do.total, quadrantStats.schedule.total, quadrantStats.delegate.total, quadrantStats.eliminate.total],
                            backgroundColor: chartColors.pending,
                            borderColor: '#888',
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: { position: 'top', labels: { color: textColor } },
                            title: { display: true, text: 'Công việc hoàn thành theo góc phần tư', color: textColor }
                        },
                        scales: {
                            x: { ticks: { color: textColor } },
                            y: { ticks: { color: textColor }, beginAtZero: true }
                        }
                    }
                });

                // Insights
                let insightsText = "";
                if (totalTasks === 0) {
                    insightsText = "Hãy thêm một vài công việc để bắt đầu theo dõi tiến độ của bạn!";
                } else if (completedTasks === totalTasks) {
                    insightsText = "Tuyệt vời! Bạn đã hoàn thành tất cả công việc. Hãy thêm những thử thách mới!";
                } else if (completedTasks > 0) {
                    const completionRate = (completedTasks / totalTasks * 100).toFixed(0);
                    insightsText += `Tỷ lệ hoàn thành tổng thể của bạn là ${completionRate}%. `; 

                    const mostCompletedQuadrant = Object.keys(quadrantStats).reduce((a, b) => quadrantStats[a].completed > quadrantStats[b].completed ? a : b);
                    const leastCompletedQuadrant = Object.keys(quadrantStats).reduce((a, b) => quadrantStats[a].completed < quadrantStats[b].completed ? a : b);

                    if (quadrantStats[mostCompletedQuadrant].completed > 0) {
                        insightsText += `Bạn có xu hướng hoàn thành nhiều công việc nhất ở góc '${mostCompletedQuadrant}'. `; 
                    }
                    if (quadrantStats[leastCompletedQuadrant].total > 0 && quadrantStats[leastCompletedQuadrant].completed === 0) {
                        insightsText += `Hãy chú ý hơn đến các công việc ở góc '${leastCompletedQuadrant}' vì bạn chưa hoàn thành công việc nào ở đó.`;
                    }
                } else {
                    insightsText = "Bạn đã có công việc, nhưng chưa có công việc nào được hoàn thành. Hãy bắt đầu ngay!";
                }
                $('#eisenhower-insights').text(insightsText);
            };
            
            // --- Listen for theme change event ---
            $(document).on('theme:changed', function() {
                updateChartsAndInsights();
            });

            // Initial render
            renderAllTasks();
        }
    });

    // === GTD Tool Logic ===
    $(function() {
        // Only run if GTD elements exist
        if ($('#gtd-inbox-input').length === 0) return;

        let gtdTasks = JSON.parse(localStorage.getItem('gtdTasks')) || {
            inbox: [],
            nextActions: [],
            projects: [],
            someday: []
        };

        const lists = {
            inbox: $('#gtd-inbox-list'),
            nextActions: $('#gtd-next-actions-list'),
            projects: $('#gtd-projects-list'),
            someday: $('#gtd-someday-list')
        };

        const saveGtdTasks = () => {
            localStorage.setItem('gtdTasks', JSON.stringify(gtdTasks));
        };

        const renderGtdItem = (item, listName) => {
            const li = $('<li>').addClass('gtd-item').attr('data-task', item.text);
            if (item.done) {
                li.addClass('done');
            }

            let content = `
                <div class="gtd-item-content">
                    <span class="gtd-item-name">${item.text}</span>
                    <div class="gtd-item-actions">
                        ${listName !== 'inbox' ? `<button class="done-btn" ${item.done ? 'disabled' : ''}>Hoàn thành</button>` : ''}
                        <button class="delete-btn" title="Xóa"><i class="ph ph-trash"></i></button>
                    </div>
                </div>
            `;

            if (listName === 'inbox') {
                content += `
                    <div class="gtd-process-actions">
                        <button class="process-btn" data-target="nextActions">➡️ Hành động</button>
                        <button class="process-btn" data-target="projects">📂 Dự án</button>
                        <button class="process-btn" data-target="someday">🗓️ Có thể làm sau</button>
                    </div>
                `;
            }

            li.html(content);
            lists[listName].append(li);

            // Event Listeners
            li.find('.delete-btn').on('click', () => {
                gtdTasks[listName] = gtdTasks[listName].filter(t => t.text !== item.text);
                saveGtdTasks();
                renderAllGtd();
            });

            li.find('.done-btn').on('click', function() {
                if ($(this).is(':disabled')) return;

                const task = gtdTasks[listName].find(t => t.text === item.text);
                if (task) {
                    task.done = true;
                    saveGtdTasks();
                    renderAllGtd();
                }
            });

            li.find('.process-btn').on('click', function() {
                const targetList = $(this).data('target');
                // Remove from inbox
                gtdTasks.inbox = gtdTasks.inbox.filter(t => t.text !== item.text);
                // Add to target list
                gtdTasks[targetList].push(item);
                saveGtdTasks();
                renderAllGtd();
            });
        };

        const renderAllGtd = () => {
            $.each(lists, (name, list) => list.empty());
            $.each(gtdTasks, (listName, tasks) => {
                tasks.forEach(item => renderGtdItem(item, listName));
            });
        };

        // Add to Inbox
        $('#gtd-add-inbox-btn').on('click', () => {
            const text = $('#gtd-inbox-input').val().trim();
            if (text) {
                gtdTasks.inbox.push({ text: text, done: false });
                saveGtdTasks();
                renderAllGtd();
                $('#gtd-inbox-input').val('');
            }
        });
        
        $('#gtd-inbox-input').on('keypress', (e) => {
            if (e.key === 'Enter') {
                $('#gtd-add-inbox-btn').click();
            }
        });

        // Initial Render
        renderAllGtd();
    });

    // === Commitment Ritual Tool Logic ===
    $(function() {
        console.log("Commitment Ritual jQuery script loaded.");
        if ($('#ritual-tool').length === 0) return;

        const copy = {
            friendly: {
                s1_header: "Hôm nay, bạn chọn con đường nào?",
                s1_stat: "Theo Dr. Piers Steel, tác giả của sách *The Procrastination Equation*, sự trì hoãn không chỉ là 'lười biếng' mà là một cuộc đấu tranh phức tạp trong não bộ. Bắt đầu ngay bây giờ là cách duy nhất để chiến thắng.",
                s1_b1: "Tập trung & Kỷ luật",
                s1_b2: "Trì hoãn & Hối tiếc",
                s2_header: "Bạn đã chọn sự trì hoãn.",
                s2_text: "Hãy hình dung: Cuối ngày, công việc vẫn còn đó. Mục tiêu xa hơn một chút. Cảm giác hối tiếc và căng thẳng tăng lên. Đây có thực sự là điều bạn muốn?",
                s2_b1: "Không, tôi muốn thay đổi.",
                s3_header: "Hãy kết nối với mục tiêu của bạn.",
                s3_stat: "Một nghiên cứu từ Đại học Dominican, California của Dr. Gail Matthews cho thấy bạn có khả năng đạt được mục tiêu cao hơn 42% chỉ bằng cách viết chúng ra một cách rõ ràng.",
                s3_prompt: "Viết ra một thành tựu quan trọng nhất bạn sẽ đạt được nếu hoàn thành công việc hôm nay.",
                s3_reward: "Mỗi hành động nhỏ hôm nay đều xây dựng nên thành tựu lớn này.",
                s3_b1: "Tôi cam kết",
                s4_header: "Biến cam kết thành hành động.",
                s4_stat: "Theo các nhà nghiên cứu từ Đại học Stanford, ví dụ như Clifford Nass, đa nhiệm (multitasking) làm giảm hiệu suất và có thể làm hỏng vùng não chịu trách nhiệm kiểm soát nhận thức. Việc tập trung vào một nhiệm vụ duy nhất giúp bạn hoàn thành nó nhanh hơn và với chất lượng cao hơn.",
                s4_prompt: "Công việc <strong>quan trọng nhất</strong> bạn sẽ hoàn thành trong 90 phút tới là gì?",
                s4_aversion: "Nếu bạn không làm việc này, bạn đang chấp nhận đứng yên tại chỗ.",
                s4_b1: "Tôi sẽ hoàn thành việc này",
                s5_header: "Bảo vệ sự tập trung của bạn.",
                s5_prompt: "Xác nhận bạn đã loại bỏ những kẻ cắp thời gian này:",
                s5_c1: "Đã đóng tất cả các tab/ứng dụng không liên quan.",
                s5_c2: "Đã đặt điện thoại ở chế độ im lặng và để ra xa.",
                s5_c3: "Đã 'xả' hết các suy nghĩ vẩn vơ ra giấy/inbox.",
                s5_b1: "Tới bước xác nhận",
                s6_header: "Xác nhận cuối cùng",
                s6_rethink: "Hãy xem lại những gì bạn đã viết. Nếu bạn chỉ viết cho có, hãy dành chút thời gian để viết lại một cách nghiêm túc. Cam kết hời hợt sẽ không dẫn đến kết quả thực sự.",
                s6_rewrite: "Chỉnh sửa lại",
                s6_commit: "Tôi đã sẵn sàng. Bắt đầu!",
                s7_text: "Bạn đã cam kết. Bây giờ là lúc hành động.",
                s7_b1: "Hoàn thành",
            },
            intense: {
                s1_header: "Hôm nay mày chọn cái gì? Thắng hay Thua?",
                s1_stat: "Dr. Piers Steel đã chỉ ra sự trì hoãn là một kẻ thù có công thức rõ ràng. Mỗi giây mày do dự là mày đang nuôi sống nó.",
                s1_b1: "CHIẾN THẮNG",
                s1_b2: "THẤT BẠI",
                s2_header: "Mày đã chọn làm kẻ thất bại.",
                s2_text: "Hình dung đi. Chiều nay, trong khi người khác ăn mừng thành quả, mày vẫn ngồi đây, với đúng cái đống công việc này, và cảm giác bất lực. Đó là thứ mày muốn à?",
                s2_b1: "Không. Tao sẽ chiến đấu.",
                s3_header: "Đừng nói suông. Cái gì khiến mày phải làm việc?",
                s3_stat: "Nghiên cứu của Dr. Gail Matthews cho thấy viết mục tiêu ra giấy tăng khả năng thành công lên 42%. Đừng lười biếng ngay cả ở bước đơn giản nhất.",
                s3_prompt: "Viết ra cái thành tựu lớn nhất mày sẽ có nếu mày không hèn nhát hôm nay. Viết ra!",
                s3_reward: "Đừng quên lý do mày bắt đầu.",
                s3_b1: "Tao cam kết.",
                s4_header: "Đừng mơ mộng nữa. Hành động đi.",
                s4_stat: "Đa nhiệm là một lời nói dối. Các nhà khoa học ở Stanford (Clifford Nass) đã chứng minh nó làm bộ não của mày ngu đi. Làm một việc thôi.",
                s4_prompt: "Chính xác thì trong 90 phút tới, mày sẽ làm xong cái việc <strong>QUAN TRỌNG GÌ?</strong> Đừng có né tránh.",
                s4_aversion: "Không làm việc này đồng nghĩa với việc chấp nhận thất bại.",
                s4_b1: "Tao sẽ nghiền nát nó",
                s5_header: "Kẻ thù đang ở quanh mày. Tiêu diệt chúng.",
                s5_prompt: "Xác nhận mày đã giết hết những thứ này:",
                s5_c1: "Đã đóng hết những thứ vô bổ.",
                s5_c2: "Điện thoại đã cút xa khỏi tầm mắt.",
                s5_c3: "Não đã trống rỗng, sẵn sàng cho trận chiến.",
                s5_b1: "TỚI BƯỚC CUỐI",
                s6_header: "ĐỌC LẠI VÀ ĐỪNG LÀM TA THẤT VỌNG.",
                s6_rethink: "Mày coi thường chính bản thân mày à? Hãy chắc chắn rằng mày đéo viết thứ nhảm nhí nào vào đây.",
                s6_rewrite: "Viết lại cho nghiêm túc.",
                s6_commit: "TAO ĐÃ CHẮC CHẮN. XUẤT KÍCH!",
                s7_text: "Mày đã hứa. Giờ thì làm đi. Đừng để tao thất vọng.",
                s7_b1: "ĐÃ XONG!",
            }
        };

        let timerInterval;

        const updateUITone = (tone) => {
            const t = copy[tone];
            const icon = $('#tone-icon-switch i');
            const button = $('#tone-icon-switch');
            const tooltip = $('.custom-tooltip');

            if (tone === 'intense') {
                icon.removeClass('ph-smiley').addClass('ph-smiley-angry');
                button.addClass('intense-active');
                tooltip.text('Chuyển sang tông giọng Thân thiện');
            } else {
                icon.removeClass('ph-smiley-angry').addClass('ph-smiley');
                button.removeClass('intense-active');
                tooltip.text('Chuyển sang tông giọng Quyết liệt');
            }
            // Step 1
            $('#ritual-s1-header').html(t.s1_header);
            $('#ritual-s1-stat').html(t.s1_stat);
            $('#ritual-choice-focus').html(t.s1_b1);
            $('#ritual-choice-procrastinate').html(t.s1_b2);
            // Step 2
            $('#ritual-s2-header').html(t.s2_header);
            $('#ritual-s2-text').html(t.s2_text);
            $('#ritual-change-mind-btn').html(t.s2_b1);
            // Step 3
            $('#ritual-s3-header').html(t.s3_header);
            $('#ritual-s3-stat').html(t.s3_stat);
            $('#ritual-s3-prompt').html(t.s3_prompt);
            $('#ritual-s3-reward').html(t.s3_reward);
            $('#ritual-commit-why-btn').html(t.s3_b1);
            // Step 4
            $('#ritual-s4-header').html(t.s4_header);
            $('#ritual-s4-stat').html(t.s4_stat);
            $('#ritual-s4-prompt').html(t.s4_prompt);
            $('#ritual-s4-aversion').html(t.s4_aversion);
            $('#ritual-commit-what-btn').html(t.s4_b1);
            // Step 5
            $('#ritual-s5-header').html(t.s5_header);
            $('#ritual-s5-prompt').html(t.s5_prompt);
            $('#ritual-start-focus-btn').html(t.s5_b1);
            const checklist = $('#ritual-checklist');
            checklist.empty();
            checklist.append(`<label><input type="checkbox" class="ritual-chk"> ${t.s5_c1}</label>`);
            checklist.append(`<label><input type="checkbox" class="ritual-chk"> ${t.s5_c2}</label>`);
            checklist.append(`<label><input type="checkbox" class="ritual-chk"> ${t.s5_c3}</label>`);
            // Step 6
            $('#ritual-s6-header').html(t.s6_header);
            $('#ritual-s6-rethink').html(t.s6_rethink);
            $('#ritual-rewrite-btn').html(t.s6_rewrite);
            $('#ritual-final-commit-btn').html(t.s6_commit);
            // Step 7
            $('#ritual-s7-text').html(t.s7_text);
            $('#ritual-end-focus-btn').html(t.s7_b1);
        };

        const goToStep = (stepNum) => {
            $('.ritual-step').removeClass('active');
            $('#ritual-step-' + stepNum).addClass('active');
        };

        const startTimer = (duration, display) => {
            let timer = duration, minutes, seconds;
            clearInterval(timerInterval);
            timerInterval = setInterval(function () {
                minutes = parseInt(timer / 60, 10);
                seconds = parseInt(timer % 60, 10);

                minutes = minutes < 10 ? "0" + minutes : minutes;
                seconds = seconds < 10 ? "0" + seconds : seconds;

                display.text(minutes + ":" + seconds);

                if (--timer < 0) {
                    clearInterval(timerInterval);
                    display.text("Hết giờ!");
                }
            }, 1000);
        }

        // --- Event Listeners ---
        $('#tone-icon-switch').on('click', function() {
            let currentTone = localStorage.getItem('ritualTone') || 'friendly';
            let newTone = currentTone === 'friendly' ? 'intense' : 'friendly';
            localStorage.setItem('ritualTone', newTone);
            updateUITone(newTone);
        });

        $('#ritual-choice-focus').on('click', () => goToStep(3));
        $('#ritual-choice-procrastinate').on('click', () => goToStep(2));
        $('#ritual-change-mind-btn').on('click', () => goToStep(3));
        $('#ritual-commit-why-btn').on('click', () => goToStep(4));
        $('#ritual-commit-what-btn').on('click', () => goToStep(5));

        $('#ritual-checklist').on('change', '.ritual-chk', function() {
            const allChecked = $('.ritual-chk').length === $('.ritual-chk:checked').length;
            $('#ritual-start-focus-btn').prop('disabled', !allChecked);
        });

        $('#ritual-start-focus-btn').on('click', function() {
            // Populate summary step
            const whyText = $('#ritual-why-input').val();
            const whatText = $('#ritual-what-input').val();
            $('#summary-why').text(whyText);
            $('#summary-what').text(whatText);
            goToStep(6);
        });

        $('#ritual-rewrite-btn').on('click', () => goToStep(3)); // Go back to the 'Why' step

        $('#ritual-final-commit-btn').on('click', function() {
            const task = $('#ritual-what-input').val();
            $('#ritual-focus-task').text(task);
            goToStep(7);
            const ninetyMinutes = 60 * 90;
            startTimer(ninetyMinutes, $('#ritual-timer'));
        });

        $('#ritual-end-focus-btn').on('click', () => {
            clearInterval(timerInterval);
            // Reset all inputs and go to first step
            $('#ritual-why-input').val('');
            $('#ritual-what-input').val('');
            $('.ritual-chk').prop('checked', false);
            $('#ritual-start-focus-btn').prop('disabled', true);
            goToStep(1);
        });

        // --- Initial Load ---
        const savedTone = localStorage.getItem('ritualTone') || 'friendly';
        updateUITone(savedTone);
        goToStep(1);
    });

    // --- Chart Logic for Blog Posts ---
    const renderBlogCharts = () => {
        // Chart for Eisenhower Post
        const timeManagementChartCtx = document.getElementById('timeManagementImpactChart');
        if (timeManagementChartCtx) {
            const isDarkMode = document.documentElement.classList.contains('dark-mode');
            const textColor = isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)';
            const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
            const primaryColor = isDarkMode ? '#c8c1b1' : '#111111';
            const secondaryColor = '#555555';

            const existingChart = Chart.getChart(timeManagementChartCtx);
            if (existingChart) {
                existingChart.destroy();
            }

            new Chart(timeManagementChartCtx, {
                type: 'bar',
                data: {
                    labels: ['Kỹ năng Quản lý Thời gian', 'Tần suất Đa nhiệm'],
                    datasets: [{
                        label: 'Mức độ Ảnh hưởng (Hệ số Beta)',
                        data: [0.401, 0.215],
                        backgroundColor: [primaryColor, secondaryColor],
                        borderColor: [primaryColor, secondaryColor],
                        borderWidth: 1
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    animation: {
                        duration: 1000,
                        easing: 'easeOutCubic'
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        title: {
                            display: true,
                            text: 'So sánh Mức độ Ảnh hưởng đến Kết quả Học tập',
                            color: textColor
                        }
                    },
                    scales: {
                        x: {
                            beginAtZero: true,
                            ticks: { color: textColor },
                            grid: { color: gridColor }
                        },
                        y: {
                            ticks: { color: textColor },
                            grid: { color: 'transparent' }
                        }
                    }
                }
            });
        }

        // Chart for Time Blocking Post
        const timeBlockingBenefitsCtx = document.getElementById('timeBlockingBenefitsChart');
        if (timeBlockingBenefitsCtx) {
            const isDarkMode = document.documentElement.classList.contains('dark-mode');
            const textColor = isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)';
            const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
            const primaryColor = isDarkMode ? '#c8c1b1' : '#111111';

            const existingChart = Chart.getChart(timeBlockingBenefitsCtx);
            if (existingChart) {
                existingChart.destroy();
            }

            new Chart(timeBlockingBenefitsCtx, {
                type: 'bar',
                data: {
                    labels: ['Tăng năng suất (%)', 'Hoàn thành nhanh hơn (%)', 'Ít lỗi hơn (%)'],
                    datasets: [{
                        label: 'Lợi ích ước tính',
                        data: [50, 40, 50],
                        backgroundColor: primaryColor,
                        borderColor: primaryColor,
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    animation: {
                        duration: 1000,
                        easing: 'easeOutCubic'
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        title: {
                            display: true,
                            text: 'Lợi ích về Năng suất của Time Blocking',
                            color: textColor
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { color: textColor },
                            grid: { color: gridColor },
                            max: 60
                        },
                        x: {
                            ticks: { color: textColor },
                            grid: { color: 'transparent' }
                        }
                    }
                }
            });
        }

        // Chart for Eisenhower Case Studies
        const caseStudyCtx = document.getElementById('caseStudyChart');
        if (caseStudyCtx) {
            const isDarkMode = document.documentElement.classList.contains('dark-mode');
            const textColor = isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)';
            const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
            const color1 = isDarkMode ? '#c8c1b1' : '#111111';
            const color2 = '#555555';
            const color3 = '#8A6E34';

            const existingChart = Chart.getChart(caseStudyCtx);
            if (existingChart) {
                existingChart.destroy();
            }

            new Chart(caseStudyCtx, {
                type: 'bar',
                data: {
                    labels: ['Giảm thời gian dự án (%)', 'Tăng hài lòng KH (%)', 'Giảm thời gian quay vòng (%)'],
                    datasets: [{
                        label: 'Cải thiện trung bình',
                        data: [20, 15, 25],
                        backgroundColor: [color1, color2, color3]
                    }]
                },
                options: {
                    responsive: true,
                    animation: { duration: 1000, easing: 'easeOutCubic' },
                    plugins: {
                        legend: { display: false },
                        title: {
                            display: true,
                            text: 'Kết quả định lượng từ các Case Study',
                            color: textColor
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { color: textColor },
                            grid: { color: gridColor },
                            max: 30
                        },
                        x: {
                            ticks: { color: textColor },
                            grid: { color: 'transparent' }
                        }
                    }
                }
            });
        }
    };

    // Initial render of blog charts
    renderBlogCharts();

    // Also re-render blog charts on theme change
    $(document).on('theme:changed', renderBlogCharts);
});
