<?php /*
Plugin Name: RV Thumb Scroller
Version: 2.7.a
Plugin URI: http://piwigo.org/ext/extension_view.php?eid=493
Description: Infinite scroll - loads thumbnails on index page as you scroll down the page
Author: rvelices
Author URI: http://www.modusoptimus.com
Has Settings: true
*/
define('RVTS_VERSION', '27a');

class RVTS
{
static function on_end_section_init()
{
	global $page;
	$page['nb_image_page'] *= pwg_get_session_var('rvts_mult', 1);
	if (count($page['items'])<$page['nb_image_page']+3)
	{
		if (!@$page['start'] || script_basename()=='picture')
			$page['nb_image_page'] = max($page['nb_image_page'], count($page['items']));
	}
	add_event_handler('loc_begin_index', array('RVTS','on_index_begin'), EVENT_HANDLER_PRIORITY_NEUTRAL+10);
}

static function on_index_begin()
{
	global $page;
	$is_ajax = isset($_GET['rvts']);
	if (!$is_ajax)
	{
		if (empty($page['items']))
			add_event_handler('loc_end_index', array('RVTS','on_end_index'));
		else
			add_event_handler('loc_end_index_thumbnails', array('RVTS','on_index_thumbnails'), EVENT_HANDLER_PRIORITY_NEUTRAL, 1);
	}
	else
	{
		$adj = (int)@$_GET['adj'];
		if ($adj)
		{
			$mult = pwg_get_session_var('rvts_mult', 1);
			if ($adj>0 && $mult<5)
				pwg_set_session_var('rvts_mult', ++$mult);
			if ($adj<0 && $mult>1)
				pwg_set_session_var('rvts_mult', --$mult);
		}
		$page['nb_image_page']=(int)$_GET['rvts'];
		add_event_handler('loc_end_index_thumbnails', array('RVTS','on_index_thumbnails_ajax'), EVENT_HANDLER_PRIORITY_NEUTRAL+5, 1);
		$page['root_path'] = get_absolute_root_url(false);
		$page['body_id'] = 'scroll';
		global $user, $template, $conf;
		include(PHPWG_ROOT_PATH.'include/category_default.inc.php');
	}
}

static function on_index_thumbnails($thumbs)
{
	global $page, $template;
	$total = count($page['items']);
	if (count($thumbs) >= $total)
	{
		add_event_handler('loc_end_index', array('RVTS','on_end_index'));
		return $thumbs;
	}
	$url_model = str_replace('123456789', '%start%', duplicate_index_url( array('start'=>123456789) ) );
	$ajax_url_model = add_url_params($url_model, array( 'rvts'=>'%per%' ) );

	$url_model = str_replace('&amp;', '&', $url_model);
	$ajax_url_model = str_replace('&amp;', '&', $ajax_url_model);

	$my_base_name = basename(dirname(__FILE__));
	$ajax_loader_image = get_root_url()."plugins/$my_base_name/ajax-loader.gif";
	$template->func_combine_script( array(
			'id'=> 'jquery',
			'load'=> 'footer',
			'path'=> 'themes/default/js/jquery.min.js',
		));
	$template->func_combine_script( array(
			'id'=> $my_base_name,
			'load'=> 'async',
			'path'=> 'plugins/'.$my_base_name.'/rv_tscroller.min.js',
			'require' => 'jquery',
			'version' => RVTS_VERSION,
		));
	$start = (int)$page['start'];
	$per_page = $page['nb_image_page'];
	$moreMsg = 'See the remaining %d photos';
	if ('en' != $GLOBALS['lang_info']['code'])
	{
		load_language('lang', dirname(__FILE__).'/');
		$moreMsg = l10n($moreMsg);
	}

	// the String.fromCharCode comes from google bot which somehow manage to get these urls
	$template->block_footer_script(null,
		"var RVTS = {
ajaxUrlModel: String.fromCharCode(".ord($ajax_url_model[0]).")+'".substr($ajax_url_model,1)."',
start: $start,
perPage: $per_page,
next: ".($start+$per_page).",
total: $total,
urlModel: String.fromCharCode(".ord($url_model[0]).")+'".substr($url_model,1)."',
moreMsg: '$moreMsg',
prevMsg: '".l10n("Previous")."',
ajaxLoaderImage: '$ajax_loader_image'
};
jQuery('.navigationBar').hide();");
	return $thumbs;
}

static function on_index_thumbnails_ajax($thumbs)
{
	global $template;
	$template->assign('thumbnails', $thumbs);
	header('Content-Type: text/html; charset='.get_pwg_charset());
	$template->pparse('index_thumbnails');
	exit;
}

static function on_end_index()
{
	global $template;
	$req = null;
	foreach($template->scriptLoader->get_all() as $script)
	{
		if($script->load_mode==2 && !$script->is_remote() && count($script->precedents)==0)
			$req = $script->id;
	}
	if($req!=null)
	{
		$my_base_name = basename(dirname(__FILE__));
		$template->func_combine_script( array(
			'id'=> $my_base_name,
			'load'=> 'async',
			'path'=> 'plugins/'.$my_base_name.'/rv_tscroller.min.js',
			'require' => $req,
			'version' => RVTS_VERSION,
		), $template->smarty);
	}
	//var_export($template->scriptLoader);
}

}

add_event_handler('loc_end_section_init', array('RVTS','on_end_section_init'));
?>