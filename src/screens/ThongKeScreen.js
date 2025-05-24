import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Dimensions, 
  ScrollView, 
  ImageBackground,
  ActivityIndicator,
  TouchableOpacity
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { BarChart } from 'react-native-chart-kit';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import database from '@react-native-firebase/database';

// Hàm định dạng tiền tệ
const formatCurrency = (amount) => {
  if (amount >= 1000000000) {
    const billion = amount / 1000000000;
    return billion % 1 === 0 ? `${billion}B` : `${billion.toFixed(1)}B`;
  } else if (amount >= 1000000) {
    const million = amount / 1000000;
    return million % 1 === 0 ? `${million}tr` : `${million.toFixed(1)}tr`;
  } else if (amount >= 1000) {
    const thousand = amount / 1000;
    return `${thousand}k`;
  }
  return amount.toString();
};

// Hàm lấy số ngày trong tháng
function getDaysInMonth(month, year) {
  switch (month) {
    case 1: case 3: case 5: case 7: case 8: case 10: case 12:
      return 31;
    case 4: case 6: case 9: case 11:
      return 30;
    case 2:
      return isLeapYear(year) ? 29 : 28;
    default:
      return 0;
  }
}

function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

const ThongKeScreen = () => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const currentDay = currentDate.getDate();

  // State cho các lựa chọn
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedFood, setSelectedFood] = useState('');
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // State cho dữ liệu
  const [invoices, setInvoices] = useState([]);
  const [invoiceDetails, setInvoiceDetails] = useState({});
  const [menuItems, setMenuItems] = useState({});
  
  // State cho phân trang biểu đồ
  const [chartPage, setChartPage] = useState(0);
  const itemsPerPage = 8;

  // Lấy dữ liệu từ Firebase
  useEffect(() => {
  const fetchData = async () => {
    try {
      const invoicesRef = database().ref('HoaDon');
      const detailsRef = database().ref('Chitiethoadon');
      const menuRef = database().ref('mon');

      // Lắng nghe thay đổi dữ liệu thời gian thực
      invoicesRef.on('value', snapshot => {
        const invoicesData = snapshot.val();
        if (invoicesData) {
          setInvoices(Object.entries(invoicesData)
            .filter(([_, value]) => value?.tinhTrang === 2)
            .map(([key, value]) => ({
              id: key,
              ...value
            }))
          );
        }
      });

      detailsRef.on('value', snapshot => {
        const detailsData = snapshot.val();
        if (detailsData) setInvoiceDetails(detailsData);
      });

      menuRef.on('value', snapshot => {
        const menuData = snapshot.val();
        if (menuData) setMenuItems(menuData);
      });

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  fetchData();

  // Cleanup function: Dừng lắng nghe sự thay đổi khi component bị unmount
  return () => {
    const invoicesRef = database().ref('HoaDon');
    const detailsRef = database().ref('Chitiethoadon');
    const menuRef = database().ref('mon');

    invoicesRef.off('value');
    detailsRef.off('value');
    menuRef.off('value');
  };
}, []);


  // Kết hợp thông tin hóa đơn
  const getCombinedData = () => {
    return invoices.map(invoice => {
      // Lấy chi tiết hóa đơn
      const details = Object.values(invoiceDetails)
        .filter(detail => detail && detail.maHoaDon == invoice.maHoaDon);
      
      // Lấy thông tin món ăn
      const items = details.map(detail => {
        const menuItem = menuItems[detail.maMon];
        return {
          ...detail,
          name: menuItem?.tenMon || `Món ${detail.maMon}`,
          price: menuItem?.giaMon || 0,
          total: (menuItem?.giaMon || 0) * detail.soluong
        };
      });

      // Phân tích ngày giờ
      const [datePart, timePart] = invoice.ngayDat?.split(' ') || ['', ''];
      const [day, month, year] = datePart.split('/').map(Number);
      const [hour, minute] = timePart?.split(':').map(Number) || [0, 0];

      return {
        ...invoice,
        items,
        day,
        month,
        year,
        hour,
        minute,
        date: datePart,
        time: timePart
      };
    });
  };

  // Xử lý khi thay đổi năm
  const handleYearChange = (year) => {
    setSelectedYear(year);
    setSelectedMonth('');
    setSelectedDay('');
    setChartPage(0);
  };

  // Xử lý khi thay đổi tháng
  const handleMonthChange = (month) => {
    setSelectedMonth(month);
    setSelectedDay('');
    setChartPage(0);
  };

  // Xử lý khi thay đổi ngày
  const handleDayChange = (day) => {
    setSelectedDay(day);
    setChartPage(0);
  };

  // Lấy danh sách món ăn
  const getFoodList = () => {
    const foodSet = new Set();
    Object.values(menuItems).forEach(item => {
      if (item && item.tenMon) {
        foodSet.add(item.tenMon);
      }
    });
    return Array.from(foodSet).sort();
  };

  // Lọc dữ liệu theo các lựa chọn
  const filteredData = getCombinedData().filter(item => {
    const matchYear = !selectedYear || item.year === parseInt(selectedYear);
    const matchMonth = !selectedMonth || item.month === parseInt(selectedMonth);
    const matchDay = !selectedDay || item.day === parseInt(selectedDay);
    const matchFood = !selectedFood || 
      item.items.some(i => i.name === selectedFood);
    
    return matchYear && matchMonth && matchDay && matchFood;
  });

  // Tính tổng doanh thu
  useEffect(() => {
    let sum = 0;
    
    if (selectedFood) {
      filteredData.forEach(invoice => {
        invoice.items.forEach(item => {
          if (item.name === selectedFood) {
            sum += item.total;
          }
        });
      });
    } else {
      sum = filteredData.reduce((total, invoice) => total + (invoice.tongTien || 0), 0);
    }
    
    setTotalRevenue(sum);
  }, [filteredData, selectedFood]);

  // Tạo dữ liệu cho biểu đồ
  const getChartData = () => {
    let labels = [];
    let data = [];
    let title = '';

    if (selectedDay && selectedMonth && selectedYear) {
      // Biểu đồ theo giờ
      labels = Array.from({ length: 24 }, (_, i) => `${i}h`);
      data = Array(24).fill(0);
      
      filteredData.forEach(invoice => {
        data[invoice.hour] += selectedFood 
          ? invoice.items.filter(i => i.name === selectedFood).reduce((sum, i) => sum + i.total, 0)
          : invoice.tongTien || 0;
      });
      
      title = `Doanh thu theo giờ - Ngày ${selectedDay}/${selectedMonth}/${selectedYear}`;
    } 
    else if (selectedMonth && selectedYear) {
      // Biểu đồ theo ngày trong tháng
      const daysInMonth = getDaysInMonth(parseInt(selectedMonth), parseInt(selectedYear));
      labels = Array.from({ length: daysInMonth }, (_, i) => `${i + 1}`);
      data = Array(daysInMonth).fill(0);
      
      filteredData.forEach(invoice => {
        const dayIndex = invoice.day - 1;
        data[dayIndex] += selectedFood 
          ? invoice.items.filter(i => i.name === selectedFood).reduce((sum, i) => sum + i.total, 0)
          : invoice.tongTien || 0;
      });
      
      title = `Doanh thu theo ngày - Tháng ${selectedMonth}/${selectedYear}`;
    } 
    else {
      // Biểu đồ theo tháng trong năm
      labels = Array.from({ length: 12 }, (_, i) => `T${i + 1}`);
      data = Array(12).fill(0);
      
      filteredData.forEach(invoice => {
        const monthIndex = invoice.month - 1;
        data[monthIndex] += selectedFood 
          ? invoice.items.filter(i => i.name === selectedFood).reduce((sum, i) => sum + i.total, 0)
          : invoice.tongTien || 0;
      });
      
      title = `Doanh thu theo tháng - Năm ${selectedYear}`;
    }

    if (selectedFood) {
      title += ` - ${selectedFood}`;
    }

    return { labels, data, title };
  };

  const { labels, data, title } = getChartData();

  // Phân trang biểu đồ
  const paginatedLabels = labels.slice(
    chartPage * itemsPerPage, 
    (chartPage + 1) * itemsPerPage
  );
  const paginatedData = data.slice(
    chartPage * itemsPerPage, 
    (chartPage + 1) * itemsPerPage
  );

  const totalPages = Math.ceil(labels.length / itemsPerPage);
  const canGoPrev = chartPage > 0;
  const canGoNext = chartPage < totalPages - 1;

  if (loading) {
      return (
        <ImageBackground
          source={require('../assets/images/templatechung.png')}
          style={[styles.background, { justifyContent: 'center', alignItems: 'center' }]}
          resizeMode="cover"
        >
          <ActivityIndicator size="large" color="#FFA500" />
          <Text style={{ marginTop: 10, color: '#FFA500' }}>Đang tải dữ liệu...</Text>
        </ImageBackground>
      );
    }

  return (
    <ImageBackground
      source={require('../assets/images/templatechung.png')}
      style={styles.background}
      resizeMode="cover"
    >
          <ScrollView contentContainerStyle={styles.scrollContainer}>

      <View style={styles.container}>
        <Text style={styles.title}>Thống kê doanh thu</Text>

        <Text style={styles.label}>Chọn năm:</Text>
        <Picker
          selectedValue={selectedYear}
          onValueChange={handleYearChange}
          style={styles.picker}
        >
          {[...Array(5)].map((_, i) => {
            const year = currentYear - 2 + i;
            return <Picker.Item key={year} label={`${year}`} value={`${year}`} />;
          })}
        </Picker>

        <Text style={styles.label}>Chọn tháng:</Text>
        <Picker
          selectedValue={selectedMonth}
          onValueChange={handleMonthChange}
          style={styles.picker}
          enabled={!!selectedYear}
        >
          <Picker.Item label="-- Tất cả --" value="" />
          {[...Array(12)].map((_, i) => (
            <Picker.Item key={i + 1} label={`Tháng ${i + 1}`} value={`${i + 1}`} />
          ))}
        </Picker>

        <Text style={styles.label}>Chọn ngày:</Text>
        <Picker
  selectedValue={selectedDay}
  onValueChange={handleDayChange}
  style={styles.picker}
  enabled={!!selectedMonth}
>
  <Picker.Item label="-- Tất cả --" value="" />
  {selectedMonth &&
    [...Array(getDaysInMonth(parseInt(selectedMonth), parseInt(selectedYear)))]
      .map((_, i) => (
        <Picker.Item key={i + 1} label={`${i + 1}`} value={`${i + 1}`} />
      ))
  }
</Picker>


        <Text style={styles.label}>Lọc theo món ăn:</Text>
        <Picker
          selectedValue={selectedFood}
          onValueChange={setSelectedFood}
          style={styles.picker}
        >
          <Picker.Item label="-- Tất cả --" value="" />
          {getFoodList().map((food, index) => (
            <Picker.Item key={index} label={food} value={food} />
          ))}
        </Picker>

        <Text style={styles.totalRevenueText}>
          {selectedDay && selectedMonth && selectedYear 
            ? `Tổng doanh thu ngày ${selectedDay}/${selectedMonth}/${selectedYear}${selectedFood ? ` - ${selectedFood}` : ''}: `
            : selectedMonth && selectedYear
              ? `Tổng doanh thu tháng ${selectedMonth}/${selectedYear}${selectedFood ? ` - ${selectedFood}` : ''}: `
              : `Tổng doanh thu năm ${selectedYear}${selectedFood ? ` - ${selectedFood}` : ''}: `
          }
          <Text style={styles.revenueAmount}>
            {totalRevenue.toLocaleString('vi-VN')} VNĐ
          </Text>
        </Text>

        <Text style={styles.subTitle}>{title}</Text>
        
        <View style={styles.chartContainer}>
          <BarChart
            data={{
              labels: paginatedLabels,
              datasets: [{ data: paginatedData }],
            }}
            width={Dimensions.get('window').width - 50}
            height={220}
            fromZero
            chartConfig={{
              backgroundColor: '#fff',
              backgroundGradientFrom: '#fff',
              backgroundGradientTo: '#fff',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(0, 128, 0, ${opacity})`,
              labelColor: () => '#333',
              fillShadowGradient: '#009000',
              fillShadowGradientOpacity: 1,
              barPercentage: 0.6,
              formatYLabel: (value) => formatCurrency(value),
              propsForLabels: {
                fontSize: 14,
                fontWeight: 'bold',
              },
            }}
            style={{ marginVertical: 12, borderRadius: 10, marginLeft: -5 }}
          />

          {totalPages > 1 && (
            <View style={styles.pagination}>
              <TouchableOpacity 
                onPress={() => setChartPage(p => Math.max(0, p - 1))}
                disabled={!canGoPrev}
                style={[styles.paginationButton, !canGoPrev && styles.disabledButton]}
              >
                <Icon name="chevron-left" size={24} color={canGoPrev ? "#FF9800" : "#ccc"} />
              </TouchableOpacity>
              
              <Text style={styles.pageText}>
                Trang {chartPage + 1}/{totalPages}
              </Text>
              
              <TouchableOpacity 
                onPress={() => setChartPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={!canGoNext}
                style={[styles.paginationButton, !canGoNext && styles.disabledButton]}
              >
                <Icon name="chevron-right" size={24} color={canGoNext ? "#FF9800" : "#ccc"} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
          </ScrollView>

    </ImageBackground>
  );
};

// Giữ nguyên các style từ mẫu gốc và thêm style mới cho phân trang
const styles = StyleSheet.create({
  background: {
    flex: 1,
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    padding: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 3 },
  label: { fontWeight: 'bold', marginTop: 10 },
  picker: {
    borderWidth: 1,
    borderColor: '#ccc',
    marginTop: 5,
    backgroundColor: '#FFDAB9',
    borderRadius: 5,
  },
  totalRevenueText: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: -14,
    marginTop: 8
  },
  revenueAmount: {
    color: 'red',
    fontWeight: 'bold',
  },
  subTitle: { 
    fontWeight: 'bold', 
    marginTop: 20, 
    marginBottom: 8, 
    fontSize: 16,
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  paginationButton: {
    padding: 10,
  },
  disabledButton: {
    opacity: 0.5,
  },
  pageText: {
    marginHorizontal: 15,
    fontSize: 16,
  }
});

export default ThongKeScreen;