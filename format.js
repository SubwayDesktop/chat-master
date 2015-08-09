(function(){


const SPECIAL_CHARS = ['\u0002', '\u0003', '\u000f', '\u001f'];
const CHARS_MEANING = ['bold', 'color', 'reset', 'underline'];
const SPECIAL_FILTER = /\u0002|\u0003|\u000f|\u001f|,/g;
const COLORS = ['rgb(255,255,255)', 'rgb(0,0,0)', 'rgb(0,0,127)', 'rgb(0,147,0)', 'rgb(255,0,0)', 'rgb(127,0,0)', 'rgb(156,0,156)', 'rgb(252,127,0)', 'rgb(255,255,0)', 'rgb(0,252,0)', 'rgb(0,147,147)', 'rgb(0,255,255)', 'rgb(0,0,252)', 'rgb(255,0,255)', 'rgb(127,127,127)', 'rgb(210,210,210)'];

/* stackoverflow #8188645 Code Jockey */
const URL_FILTER = /(http|ftp|https):\/\/[\w-]+(\.[\w-]+)+([\w.,@?^=%&amp;:\/~+#-]*[\w@?^=%&amp;\/~+#-])?/g;


function format(text){
    /* record special position */
    var pos = [];
    
    /* contain split text */
    var segments = [];
    
    /* find special chars */
    var i, index;
    for(i=0; i<text.length; i++)
	if((index = SPECIAL_CHARS.indexOf(text[i])) != -1)
	    pos[i] = CHARS_MEANING[index];

    /* find links */
    var i, index;
    /* if an URL is cut off by special chars after '//', regard it as a legal one */
    var text_links = text.replace(SPECIAL_FILTER, 'X');
    var urls = text_links.match(URL_FILTER);
    var offset = 0;
    if(urls)
	for(i=0; i<urls.length; i++){
	    index = text_links.indexOf(urls[i])
	    text_links = text_links.slice(index + urls[i].length, text_links.length);
	    pos[index + offset] = 'url_begin';
	    pos[index + urls[i].length + offset] = 'url_end';
	    offset += (index + urls[i].length);
	}
    
    /* split the text */
    var last = 0;
    if(pos)
	for(i=0; i<pos.length; i++){
	    if(pos[i]){
		if(pos[i] == 'url_begin'){
		    segments.push(text.slice(last, i));
		    last = i;
		}else if(pos[i] == 'url_end'){
		    segments.push(text.slice(last, i+1));
		    last = i+1;
		}else{
		    segments.push(text.slice(last, i));
		    last = i+1;
		}
		segments.push({type: pos[i]});
	    }
	}    
    segments.push(text.slice(last, text.length));
    
    /* generate formatted text */
    var output = [];
    var bold = false;
    var underline = false;
    var color = null;
    var color_bg = null;
    var j, k;
    for(i=0; i<segments.length; i++){
	if(typeof segments[i] == 'string'){
	    if(!segments[i])
		continue;
	    if(color == 'pending'){
		var fg;
		fg = segments[i].match(/^(1[0-5])/);
		if(!fg)
		    fg = segments[i].match(/^0(\d)/);
		if(!fg)
		    fg = segments[i].match(/^(\d)/);
		if(fg){
		    color = COLORS[fg[1]];
		    segments[i] = segments[i].replace(fg[0], '');
		    var bg;
		    bg = segments[i].match(/^,(1[0-5])/);
		    if(!bg)
			bg = segments[i].match(/^,0(\d)/);
		    if(!bg)
			bg = segments[i].match(/^,(\d)/);
		    if(bg){
			color_bg = COLORS[bg[1]];
			segments[i] = segments[i].replace(bg[0], '');
		    }else{
			color_bg = null;
		    }
		}else{
		    color = null;
		}
	    }
	    if(!segments[i])
		continue;
	    var span = create('span', {
		className: 'text_segment',
		textContent: segments[i]
	    });
	    if(bold)
		span.classList.add('bold');
	    if(underline)
		span.classList.add('underline');
	    if(color)
		span.style.color = color;
	    if(color_bg)
		span.style.backgroundColor = color_bg;
	    output.push(span);
	}else{
	    switch(segments[i].type){
	    case 'bold':
		bold = !bold;
		break;
	    case 'underline':
		underline = !underline;
		break;
	    case 'color':
		color = 'pending';
		break;
	    case 'reset':
		color = null;
		color_bg = null;
		break;
	    case 'url_begin':
		output.push(create('a', {
		    className: 'link'
		}));
		break;
	    case 'url_end':
		var href = '';
		for(j=output.length-2; j>=0; j--){
		    if(output[j].classList
		       && output[j].classList.contains('link')){
			for(k=j+1; k<output.length; k++){
			    output[j].appendChild(output[k]);
			    href += output[k].textContent;
			}
			var count = output.length-j-1;
			for(k=0; k<count; k++)
			    output.pop();
			output[j].href = href;
			break;
		    }
		}
		break;
	    }
	}
    }
    return output;
}


window.format_message = format;


})();
