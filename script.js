document.getElementById('fileInput').addEventListener('change', handleFileUpload);
document.getElementById('rowsPerPageSelect').addEventListener('change', handleRowsPerPageChange);
document.getElementById('sortButton').addEventListener('click', handleSort);
document.getElementById('filterInput').addEventListener('input', handleFilter);
document.getElementById('exportButton').addEventListener('click', handleExport);

const rangeSortDropdown = document.getElementById('rangeSortDropdown');
rangeSortDropdown.addEventListener('change', handleRangeSort);

let data = [];
let filteredData = [];
let currentPage = 1;
let rowsPerPage = 10;
let sortColumnIndex = -1;
let sortDirection = 'asc'; // or 'desc'

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const text = e.target.result;
            data = parseCSV(text);
            filteredData = data.rows;
            displayPage(1);
            createPagination();
            
            // Populate range sort dropdown with column headers
            rangeSortDropdown.innerHTML = '<option value="all">All Columns</option>';
            data.headers.forEach((header, index) => {
                const option = document.createElement('option');
                option.value = index.toString();
                option.textContent = header;
                rangeSortDropdown.appendChild(option);
            });
        };
        reader.readAsText(file);
    }
}

function parseCSV(text) {
    const lines = text.split('\n');
    const headers = lines[0].split(',');
    const rows = lines.slice(1).map(line => line.split(','));
    return { headers, rows };
}

function displayPage(page) {
    currentPage = page;
    const tableHeader = document.getElementById('tableHeader');
    const tableBody = document.getElementById('tableBody');
    
    // Clear previous data
    tableHeader.innerHTML = '';
    tableBody.innerHTML = '';
    
    // Display headers
    const headerRow = document.createElement('tr');
    data.headers.forEach((header, index) => {
        const th = document.createElement('th');
        th.textContent = header;
        th.setAttribute('data-index', index); // Add data-index attribute for sorting
        th.classList.add('sortable'); // Add sortable class for styling
        headerRow.appendChild(th);
    });
    tableHeader.appendChild(headerRow);
    
    // Calculate start and end indices for the current page
    const startIndex = (page - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    
    // Display rows for the current page
    filteredData.slice(startIndex, endIndex).forEach(row => {
        const tr = document.createElement('tr');
        row.forEach(cell => {
            const td = document.createElement('td');
            td.textContent = cell;
            tr.appendChild(td);
        });
        tableBody.appendChild(tr);
    });
    
    // Add event listeners for sorting
    document.querySelectorAll('#tableHeader th').forEach(th => {
        th.addEventListener('click', () => {
            const columnIndex = parseInt(th.getAttribute('data-index'));
            handleColumnSort(columnIndex);
        });
    });
}

function createPagination() {
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';
    const pageCount = Math.ceil(filteredData.length / rowsPerPage);
    
    for (let i = 1; i <= pageCount; i++) {
        const button = document.createElement('button');
        button.textContent = i;
        button.className = currentPage === i ? 'page-button active' : 'page-button';
        button.addEventListener('click', () => {
            displayPage(i);
            updateActiveButton(i);
        });
        pagination.appendChild(button);
    }
}

function updateActiveButton(page) {
    const buttons = document.querySelectorAll('#pagination button');
    buttons.forEach(button => {
        button.classList.remove('active');
    });
    buttons[page - 1].classList.add('active');
}

function handleFilter(event) {
    const filterText = event.target.value.trim().toLowerCase();
    if (!filterText) {
        filteredData = data.rows; // Reset to show all rows if filter is empty
    } else if (filterText.includes('-')) {
        // Handle range filtering
        const [min, max] = filterText.split('-').map(num => parseFloat(num.trim()));
        const columnIndex = parseInt(rangeSortDropdown.value);
        
        filteredData = data.rows.filter(row => {
            if (isNaN(columnIndex) || columnIndex === -1) {
                // If no specific column is selected or invalid, apply range filter to any numeric column
                return row.some(cell => {
                    const numericValue = parseFloat(cell);
                    return !isNaN(numericValue) && numericValue >= min && numericValue <= max;
                });
            } else {
                // Apply range filter to the selected column
                const numericValue = parseFloat(row[columnIndex]);
                return !isNaN(numericValue) && numericValue >= min && numericValue <= max;
            }
        });
    } else {
        // Normal keyword filtering
        filteredData = data.rows.filter(row =>
            row.some(cell => cell.toLowerCase().includes(filterText))
        );
    }
    
    displayPage(1);
    createPagination();
}

function highlightSearch(keyword) {
    const table = document.getElementById('dataTable');
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        cells.forEach(cell => {
            const text = cell.textContent.toLowerCase();
            const index = text.indexOf(keyword);
            if (index !== -1) {
                const newText = `${cell.textContent.substring(0, index)}<span class="highlight">${cell.textContent.substring(index, index + keyword.length)}</span>${cell.textContent.substring(index + keyword.length)}`;
                cell.innerHTML = newText;
            }
        });
    });
}

function handleSort() {
    if (sortColumnIndex !== -1) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        sortDataByColumn(sortColumnIndex, sortDirection);
        displayPage(currentPage);
        createPagination();
    }
}

function handleColumnSort(columnIndex) {
    sortColumnIndex = columnIndex;
    sortDirection = 'asc'; // Reset to default ascending
    sortDataByColumn(sortColumnIndex, sortDirection);
    displayPage(currentPage);
    createPagination();
}

function sortDataByColumn(columnIndex, direction) {
    filteredData.sort((a, b) => {
        const cellA = a[columnIndex];
        const cellB = b[columnIndex];
        
        // Handle numeric range sorting
        if (/^\d+-\d+$/.test(cellA) && /^\d+-\d+$/.test(cellB)) {
            const rangeA = cellA.split('-').map(num => parseInt(num.trim()));
            const rangeB = cellB.split('-').map(num => parseInt(num.trim()));
            return direction === 'asc' ? rangeA[0] - rangeB[0] : rangeB[0] - rangeA[0];
        }
        
        // Default alphanumeric sorting
        return direction === 'asc' ? cellA.localeCompare(cellB) : cellB.localeCompare(cellA);
    });
}

function handleRowsPerPageChange(event) {
    rowsPerPage = parseInt(event.target.value);
    displayPage(1);
    createPagination();
}

function handleExport() {
    const header = data.headers.join(',');
    const csvRows = filteredData.map(row => row.join(',')).join('\n');
    const csvContent = `${header}\n${csvRows}`;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'export.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function handleRangeSort(event) {
    const selectedColumnIndex = rangeSortDropdown.value;
    if (selectedColumnIndex !== 'all') {
        sortColumnIndex = parseInt(selectedColumnIndex);
        sortDirection = 'asc'; // Reset to default ascending
        sortDataByColumn(sortColumnIndex, sortDirection);
        displayPage(currentPage);
        createPagination();
    }
}