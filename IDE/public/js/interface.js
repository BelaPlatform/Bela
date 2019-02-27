var dropdownLoaded = false;
var menuOpened = false;

// define the tabs object
function openTabs() {
  $('[data-tabs]').toggleClass('tabs-open');
  $('[data-tab-open] span').toggleClass('rot');
  if (!dropdownLoaded) {
    var $script = $("<script></script>").attr('src', '/js/dropdown.js');
    $script.appendTo($('head'));
    dropdownLoaded = true;
  }
}

function matchTabForAndTab(tabFor) {
  $('[data-tab]').each(function(){
    var tab = $(this).data('tab');
    $(this).hide();
    if (tab === tabFor) {
      $(this).fadeIn();
    }
  });
}

function matchTabFor(target) {
  var tab = target;
  $('[data-tab-for]').each(function(){
    var tabFor = $(this).data('tab-for');
    if (tabFor === tab) {
      $(this).addClass('active');
      matchTabForAndTab(tabFor);
    }
  });
}

// Open the tabs:
$('[data-tab-open]').click(function(event) {
  event.preventDefault();
  // If none of the tabs are active:
  var len = $('[data-tab-menu] .active').length;
  if (len < 1) {
    // Then show the project explorer.
    matchTabFor("explorer");
  }
  if (menuOpened) {
    menuOpened = false;
  } else {
    menuOpened = true;
  }
  openTabs();
});

// Making the tab labels active/inactive:
$('[data-tab-for]').click(function(event) {
  event.preventDefault();
  var tabFor = $(this).data('tab-for');
  if (!$(this).hasClass('active')) {
    matchTabFor(tabFor);
  }
  $('[data-tab-for]').removeClass('active');
  $(this).addClass('active');
  if ($('[data-tabs]').hasClass('tabs-open')) {
    return false;
  }
  if (!menuOpened) {
    menuOpened = true;
    openTabs();
  }
});

// increment / decrement the text inputs styled to look like the number inputs
$('[data-number-picker]').each(function(){
  $(this).find('[data-number-picker-increment]').on('click', function(){
    if (+($(this).siblings('[data-number-picker-input]').val()) < +($(this).siblings('[data-number-picker-input]').attr('max'))) {
      $(this).siblings('[data-number-picker-input]').val(+($(this).siblings('[data-number-picker-input]').val()) + +($(this).siblings('[data-number-picker-input]').attr('step')));
      $(this).val(+($(this).siblings('[data-number-picker-input]').val()));
    }
  });
  $(this).find('[data-number-picker-decrement]').on('click', function(){
    if (+($(this).siblings('[data-number-picker-input]').val()) > +($(this).siblings('[data-number-picker-input]').attr('min'))) {
      $(this).siblings('[data-number-picker-input]').val(+($(this).siblings('[data-number-picker-input]').val()) - +($(this).siblings('[data-number-picker-input]').attr('step')));
      $(this).val(+($(this).siblings('[data-number-picker-input]').val()));
    }
  });
});
